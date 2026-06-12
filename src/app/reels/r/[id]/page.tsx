"use client";
// URL route — AppProvider reads usePathname() to set the correct activeTab.
import dynamic from "next/dynamic";
const Home = dynamic(() => import("../../../page"), { ssr: false });
export default function Page() { return <Home />; }
