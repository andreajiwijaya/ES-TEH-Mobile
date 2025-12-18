import { Redirect } from "expo-router";

export default function Index() {
  // Langsung alihkan ke halaman Splash
  return <Redirect href={"/splash" as any} />;
}