import { useEffect, useRef, useState } from "react";
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
const FILE_REGION_ID = "qr-file-reader"; // hidden — only used as a mount point for file decoding

export default function AttendanceScanner() {
  const html5QrCodeRef = useRef(null);
  const fileQrCodeRef = useRef(null); // separate instance, used only for scanFile() so it doesn't clash with the live camera stream
  const fileInputRef = useRef(null);
  const submittingRef = useRef(false); // read inside the scan callback, avoids stale closures
  const statusRef = useRef("check_in"); // same reason — see below

  const [attendanceStatus, setAttendanceStatus] = useState("check_in");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [decodeError, setDecodeError] = useState(null);

  // Keep the refs in sync with state so the scan callback (registered once,
  // on mount) always reads the *current* value instead of the value that
  // was current when the camera first started.
  useEffect(() => {
    statusRef.current = attendanceStatus;
  }, [attendanceStatus]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(QR_REGION_ID);
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" }, // back camera on phones
        { fps: 10, qrbox: 250 },
        (decodedText) => handleScan(decodedText),
        () => {} // per-frame "no QR found" callback — expected, ignore it
      )
      .catch((err) => {
        setCameraError(
          "Couldn't access the camera. Check that you allowed camera permission and that the page is loaded over HTTPS."
        );
        console.error("Camera start failed:", err);
      });

    return () => {
      // stop() releases the camera; clear() removes the injected video/canvas
      html5QrCode
        .stop()
        .then(() => html5QrCode.clear())
        .catch(() => {});
    };
    // Runs once on mount only — we don't want to restart the camera every
    // time attendanceStatus changes, hence the refs above instead of deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A second, non-streaming Html5Qrcode instance dedicated to decoding
  // uploaded image files. Kept separate from html5QrCodeRef because that one
  // has an active camera stream attached — reusing it for scanFile() would
  // fight over the same DOM element.
  useEffect(() => {
    fileQrCodeRef.current = new Html5Qrcode(FILE_REGION_ID, /* verbose= */ false);
  }, []);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file || submittingRef.current) return;

    setDecodeError(null);

    try {
      const decodedText = await fileQrCodeRef.current.scanFile(file, false);
      await handleScan(decodedText);
    } catch (err) {
      setDecodeError("Couldn't find a QR code in that image. Try a clearer photo or screenshot.");
    }
  }

  async function handleScan(decodedText) {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setDecodeError(null);

    try {
      await html5QrCodeRef.current?.pause(true);
    } catch {
      // scanner may already be stopped/paused — safe to ignore
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Check-in failed");
      }

      setResult({
        ok: true,
        message:
          currentStatus === "check_in"
            ? "Checked in successfully"
            : "Checked out successfully",
      });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function scanAgain() {
    setResult(null);
    setDecodeError(null);
    html5QrCodeRef.current?.resume();
  }

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

          <div id={QR_REGION_ID} className="w-full overflow-hidden rounded-md" />
          {/* Never shown — Html5Qrcode needs a real DOM node to mount into, even for file-only decoding */}
          <div id={FILE_REGION_ID} className="hidden" />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
          >
            Upload a QR code image
          </Button>

          {cameraError && (
            <div className="w-full rounded-md bg-red-100 p-3 text-center text-sm text-red-700">
              {cameraError}
            </div>
          )}

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

          {result && !result.ok && (
            <Button onClick={scanAgain} variant="outline">
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}