"use client";

import React, { useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import { useApp } from "../../components/AppContext";
import { AppContent } from "../page";

function ProfileLoader() {
  const params = useParams();
  const username = params.username as string;
  const { setViewingUserId, setActiveTab } = useApp();

  const decodedName = username ? decodeURIComponent(username) : "";
  const isAtRoute = decodedName.startsWith("@");

  useEffect(() => {
    if (isAtRoute) {
      const name = decodedName.substring(1); // strip the leading @
      setViewingUserId(name);
      setActiveTab("profile", name);
    }
  }, [username, decodedName, isAtRoute, setViewingUserId, setActiveTab]);

  if (!isAtRoute) {
    notFound();
  }

  return <AppContent />;
}

export default function UserProfilePage() {
  return <ProfileLoader />;
}
