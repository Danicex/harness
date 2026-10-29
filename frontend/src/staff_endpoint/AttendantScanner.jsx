import { Component, useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const QR_REGION_ID = "qr-reader";
const FILE_REGION_ID = "qr-file-reader"; // hidden: only a mount point for file decoding

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// Stop + clear a scanner without ever throwing. html5-qrcode's stop() rejects
// if the scanner never started, and clear() can throw synchronously, which
// during a React unmount would take the whole page down.
async function safeStop(scanner) {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    /* not running: fine */
  }
  try {
    scanner.clear();
  } catch {
    /* already cleared or still busy: fine */
  }
}

// html5-qrcode rejects with a string or an Error depending on the failure
function friendlyCameraError(err) {
  const text = String(err?.message ?? err ?? "");

  if (/NotAllowed|Permission|denied/i.test(text)) {
    return "Camera access was blocked. Allow camera permission for this site in your browser settings, then tap Try again. You can still upload a QR code image below.";
  }
  if (/NotFound|Requested device not found|no camera/i.test(text)) {
    return "No camera was found on this device. You can upload a QR code image instead.";
  }
  if (/NotReadable|TrackStart|in use/i.test(text)) {
    return "The camera is being used by another app or tab. Close it and tap Try again, or upload a QR code image instead.";
  }
  return "Couldn't start the camera. You can tap Try again or upload a QR code image instead.";
}

/* -------------------------------------------------------------------------- */
/*  Error boundary: any render error shows a card instead of a blank page     */
/* -------------------------------------------------------------------------- */

class ScannerErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("AttendanceScanner crashed:", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex flex-col items-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-red-700">
              The scanner hit an unexpected problem.
            </p>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Scanner                                                                   */
/* -------------------------------------------------------------------------- */

function Scanner() {
  const scannerRef = useRef(null); // live camera instance (null when not running)
  const fileScannerRef = useRef(null); // separate instance, only for scanFile()
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false); // read inside the scan callback: avoids stale closures
  const statusRef = useRef("check_in"); // same reason

  const [attendanceStatus, setAttendanceStatus] = useState("check_in");
  const [cameraState, setCameraState] = useState("starting"); // "starting" | "active" | "error"
  const [cameraError, setCameraError] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [decodeError, setDecodeError] = useState(null);

  useEffect(() => {
    statusRef.current = attendanceStatus;
  }, [attendanceStatus]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  /* ---------- Camera ---------- */
  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;

    setCameraError(null);
    setCameraState("starting");

    // Plain HTTP / some in-app browsers have no camera API at all
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "This page can't use the camera. Open it over HTTPS in your browser, or upload a QR code image instead."
      );
      setCameraState("error");
      return;
    }

    // Make sure any previous instance is fully released before starting a new one
    const previous = scannerRef.current;
    scannerRef.current = null;
    await safeStop(previous);
    if (!mountedRef.current) return;

    let scanner;
    try {
      scanner = new Html5Qrcode(QR_REGION_ID);
    } catch (err) {
      console.error("Scanner init failed:", err);
      setCameraError(friendlyCameraError(err));
      setCameraState("error");
      return;
    }
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" }, // back camera on phones
        { fps: 10, qrbox: 250 },
        (decodedText) => handleScan(decodedText),
        () => {} // per-frame "no QR found": expected, ignore
      );

      // Unmounted or replaced while the permission prompt was open
      if (!mountedRef.current || scannerRef.current !== scanner) {
        await safeStop(scanner);
        return;
      }
      setCameraState("active");
    } catch (err) {
      console.error("Camera start failed:", err);
      if (!mountedRef.current || scannerRef.current !== scanner) return;

      scannerRef.current = null;
      await safeStop(scanner);
      if (!mountedRef.current) return;

      setCameraError(friendlyCameraError(err));
      setCameraState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    startCamera();

    // second, non-streaming instance used only to decode uploaded images
    try {
      fileScannerRef.current = new Html5Qrcode(FILE_REGION_ID, false);
    } catch (err) {
      console.error("File scanner init failed:", err);
    }

    return () => {
      mountedRef.current = false;

      const live = scannerRef.current;
      scannerRef.current = null;
      safeStop(live); // never throws

      const file = fileScannerRef.current;
      fileScannerRef.current = null;
      try {
        file?.clear();
      } catch {
        /* ignore */
      }
    };
  }, [startCamera]);

  /* ---------- Upload fallback ---------- */
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires onChange
    if (!file || submittingRef.current) return;

    setDecodeError(null);

    if (!fileScannerRef.current) {
      setDecodeError("Image scanning isn't available right now. Please reload the page.");
      return;
    }

    let decodedText;
    try {
      decodedText = await fileScannerRef.current.scanFile(file, false);
    } catch {
      setDecodeError("Couldn't find a QR code in that image. Try a clearer photo or screenshot.");
      return;
    }
    await handleScan(decodedText);
  }

  /* ---------- Submit ---------- */
  async function handleScan(decodedText) {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setDecodeError(null);

    // pause the live camera (if there is one) so it doesn't fire again
    try {
      scannerRef.current?.pause(true);
    } catch {
      /* not scanning: safe to ignore */
    }

    try {
      const token = localStorage.getItem("token");
      const currentStatus = statusRef.current;

      const res = await fetch(`${API_BASE}/attendance/create_attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verification_code: decodedText,
          status: currentStatus,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data?.detail;
        throw new Error(
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
            ? detail.map((d) => d.msg).join(", ")
            : "Check-in failed"
        );
      }

      if (!mountedRef.current) return;
      setResult({
        ok: true,
        message:
          currentStatus === "check_in"
            ? "Checked in successfully"
            : "Checked out successfully",
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  function scanAgain() {
    setResult(null);
    setDecodeError(null);
    try {
      scannerRef.current?.resume();
    } catch {
      /* camera isn't running; the upload option still works */
    }
  }

  const cameraFailed = cameraState === "error";

  return (
    <div className="flex min-h-[300px] flex-col items-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Attendance Scanner
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={attendanceStatus === "check_in" ? "default" : "outline"}
              onClick={() => setAttendanceStatus("check_in")}
            >
              Check in
            </Button>

            <Button
              variant={attendanceStatus === "check_out" ? "default" : "outline"}
              onClick={() => setAttendanceStatus("check_out")}
            >
              Check out
            </Button>
          </div>

          {/* Always mounted (html5-qrcode needs the node), just hidden when the camera failed */}
          <div
            id={QR_REGION_ID}
            className={`w-full overflow-hidden rounded-md ${cameraFailed ? "hidden" : ""}`}
          />
          {cameraState === "starting" && (
            <p className="text-sm text-muted-foreground">Starting camera…</p>
          )}
          <div id={FILE_REGION_ID} className="hidden" />

          {cameraFailed && (
            <div className="flex w-full flex-col items-center gap-3 rounded-md bg-red-100 p-3 text-center text-sm text-red-700">
              <p>{cameraError}</p>
              <Button size="sm" variant="outline" onClick={startCamera}>
                Try again
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant={cameraFailed ? "default" : "outline"}
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
          >
            Upload a QR code image
          </Button>

          {decodeError && (
            <div className="w-full rounded-md bg-red-100 p-3 text-center text-sm text-red-700">
              {decodeError}
            </div>
          )}

          {result && (
            <div
              className={`w-full rounded-md p-3 text-center text-sm ${
                result.ok
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {result.message}
            </div>
          )}

          {result && !result.ok && !cameraFailed && (
            <Button onClick={scanAgain} variant="outline">
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AttendanceScanner() {
  return (
    <ScannerErrorBoundary>
      <Scanner />
    </ScannerErrorBoundary>
  );
}