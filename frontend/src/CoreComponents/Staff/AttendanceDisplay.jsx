import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RenderAttendance from './RenderAttendant'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";



const POLL_INTERVAL_MS = 60000; // 1 minute
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const AttendanceQr = () => {
  const [code, setCode] = useState(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState(null);

  const fetchCode = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/current-code`);

      if (!res.ok) {
        throw new Error("Failed to load code");
      }

      const data = await res.json();

      setCode(data.code);
      setExpiresIn(data.expires_in);
      setError(null);
    } catch {
      setError("Couldn't reach the server. Retrying…");
    }
  }, []);

  useEffect(() => {
    fetchCode();

    const interval = setInterval(fetchCode, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchCode]);

  return (
    <div className="flex min-h-[300px] justify-center ">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Scan to check in
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          {code ? (
            <div className="rounded-xl border bg-white p-4">
              <QRCodeSVG value={code} size={240} />
            </div>
          ) : (
            <div className="flex h-[272px] w-[272px] items-center justify-center text-slate-400">
              Loading…
            </div>
          )}

          <Badge variant="secondary">
            code refreshes every {expiresIn}s
          </Badge>

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AttendanceDisplay() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="qr" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="qr">
            Attendance QR
          </TabsTrigger>

          <TabsTrigger value="attendance">
            Attendance Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr">
          <AttendanceQr />
        </TabsContent>

        <TabsContent value="attendance">
          <RenderAttendance />
        </TabsContent>
      </Tabs>
    </div>
  );
}

