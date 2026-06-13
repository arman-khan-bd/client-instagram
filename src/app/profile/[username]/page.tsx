"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { AppProvider, useApp } from "../../../components/AppContext";
import { AppContent } from "../../page";

function ProfileLoader() {
  const { username } = useParams();
  const { setViewingUserId, setActiveTab } = useApp();

  useEffect(() => {
    if (username) {
      const name = decodeURIComponent(username as string);
      setViewingUserId(name);
      setActiveTab("profile", name);
    }
  }, [username, setViewingUserId, setActiveTab]);

  return <AppContent />;
}

export default function UserProfilePage() {
  return <ProfileLoader />;
}
