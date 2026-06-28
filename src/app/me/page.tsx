"use client";
import dynamic from "next/dynamic";
const Home = dynamic(() => import("../page"), { ssr: false });
export default function Page() { return <Home />; }
