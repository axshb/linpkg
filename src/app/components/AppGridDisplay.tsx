"use client";

import type { AppCatalogItem } from "../lib/data";
import { useState, useMemo } from "react";
import styles from "./AppGridDisplay.module.css";

interface AppGridDisplayProps {
  apps: AppCatalogItem[];
}

type PackageManager =
  | "ubuntu"
  | "fedora"
  | "arch"
  | "opensuse"
  | "nix"
  | "flatpak"
  | "snap";

function AppCard({ app, isSelected, packageManager, toggleSelection }: any) {
  const available =
    packageManager === null ? true : app[packageManager] !== null;

  const cardClasses = [
    styles.card,
    isSelected ? styles.selected : "",
    !available ? styles.unavailable : "",
  ].join(" ");

  return (
    <div
      className={cardClasses}
      onClick={() => available && toggleSelection(app.id)}
      title={
        !available
          ? app.unavailable_reason || "Not available for this distro"
          : app.description
      }
    >
      <div className={styles.iconPlaceholder}>
        {app.icon_url ? (
          <img src={app.icon_url} alt="" className={styles.icon} />
        ) : (
          "📦"
        )}
      </div>
      <div className={styles.cardTextContent}>
        <h3 className={styles.appName}>{app.name}</h3>
      </div>

      <div className={styles.checkboxArea}>
        <div className={styles.fakeCheckbox}>{isSelected && "✓"}</div>
      </div>
    </div>
  );
}

export function AppGridDisplay({ apps }: AppGridDisplayProps) {
  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [packageManager, setPackageManager] = useState<PackageManager | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const appsByCategory = useMemo(() => {
    const result: Record<string, AppCatalogItem[]> = {};
    for (const app of apps) {
      const category = app.category || "Uncategorized";
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(app);
    }
    return result;
  }, [apps]);

  const toggleSelection = (appId: number) => {
    setSelectedApps((prevSelectedApps) => {
      if (prevSelectedApps.includes(appId)) {
        return prevSelectedApps.filter((id) => id !== appId);
      } else {
        return [...prevSelectedApps, appId];
      }
    });
  };

  const generateScript = async () => {
    if (selectedApps.length === 0 || !packageManager) return;

    setIsGenerating(true);
    try {
      const response = await fetch("../api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appIds: selectedApps,
          packageManager: packageManager,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate script.");
      }

      const scriptBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(scriptBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `install_${packageManager}.sh`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Script generation failed:", err);
      alert("Error generating script: " + err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.appGridContainer}>
      <div className={styles.packageManagerSelectorWrapper}>
        <label>Distro / Format: </label>
        <select
          className={styles.packageManagerSelect}
          value={packageManager ?? ""}
          onChange={(e) => setPackageManager(e.target.value as PackageManager)}
        >
          <option value="">-- Select System --</option>
          <option value="ubuntu">Ubuntu / Debian (apt)</option>
          <option value="fedora">Fedora (dnf)</option>
          <option value="arch">Arch Linux (pacman)</option>
          <option value="opensuse">OpenSUSE (zypper)</option>
          <option value="nix">Nix (nix-env)</option>
          <option value="flatpak">Flatpak (Universal)</option>
          <option value="snap">Snap (Universal)</option>
        </select>

        <button
          className={styles.generateButton}
          onClick={generateScript}
          disabled={
            !packageManager || selectedApps.length === 0 || isGenerating
          }
        >
          {isGenerating
            ? "Generating..."
            : `Download Script (${selectedApps.length})`}
        </button>

        <div className={styles.info}>
          <p>🛈 Always check scripts before running them.</p>
        </div>
      </div>

      <div className={styles.appGridCatalog}>
        {Object.entries(appsByCategory).map(([category, appList]) => (
          <div key={category} className={styles.categorySection}>
            <h2 className={styles.categoryHeader}>{category}</h2>

            <div className={styles.cardList}>
              {appList.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  isSelected={selectedApps.includes(app.id)}
                  packageManager={packageManager}
                  toggleSelection={toggleSelection}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
