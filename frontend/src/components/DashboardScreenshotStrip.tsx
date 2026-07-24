"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./DashboardScreenshotStrip.module.css";

export function DashboardScreenshotStrip() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.strip}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/signoz/dashboard-preview.svg"
          alt="Weft Agent Observatory dashboard preview"
          className={styles.image}
        />
      </div>
    );
  }

  return (
    <div className={styles.strip}>
      <Image
        src="/signoz/dashboard-preview.png"
        alt="Weft Agent Observatory dashboard in SigNoz"
        width={1200}
        height={420}
        className={styles.image}
        onError={() => setFailed(true)}
        priority={false}
      />
    </div>
  );
}
