import { Stack } from "expo-router";
import { useEffect } from "react";
import { notificationService } from "@/lib/notificationService";

export default function RootLayout() {
  useEffect(() => {
    // Initialize notifications when app starts
    notificationService.initialize();
  }, []);

  return <Stack />;
}
