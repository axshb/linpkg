'use client';

import type { AppCatalogItem } from '../lib/data';
import { useState, useMemo } from 'react';
import styles from "./AppGridDisplay.module.css";

interface AppGridDisplayProps {
  apps: AppCatalogItem[];
}

function AppCard({ app, isSelected, packageManager, toggleSelection }: any) {

  // check availability 
  const available =
    packageManager === null
      ? true
      : packageManager === 'apt'
        ? app.apt_name !== null
        : packageManager === 'dnf'
          ? app.dnf_name !== null
          : app.pacman_name !== null;

  // logic for classes
  const cardClasses = [
    styles.card,
    isSelected ? styles.selected : '',
    !available ? styles.unavailable : ''
  ].join(' ');

  return (
    <div
      className={cardClasses}
      onClick={() => available && toggleSelection(app.id)}
    >
      <div className={styles.iconPlaceholder}>
        {app.icon_url ?
          <img src={app.icon_url} alt="" className={styles.icon} /> :
          '📦'
        }
      </div>
      <div className={styles.cardTextContent}>
        <h3 className={styles.appName}>{app.display_name}</h3>
      </div>

      <div className={styles.checkboxArea}>
        <div className={styles.fakeCheckbox}>{isSelected && '✓'}</div>
      </div>
    </div>
  );
}

export function AppGridDisplay({ apps }: AppGridDisplayProps) {

  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [packageManager, setPackageManager] = useState<'apt' | 'dnf' | 'pacman' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // categorizing apps (memo for opti)
  const appsByCategory = useMemo(() => {
    const result: Record<string, AppCatalogItem[]> = {};
    for (const app of apps) {
      const category = app.category || 'Uncategorized'
      if (!result[category]) {
        result[category] = []
      }
      result[category].push(app);
    };
    return result;
  }, [apps]);

  // toggling app selections
  const toggleSelection = (appId: number) => {
    setSelectedApps(prevSelectedApps => {
      if (prevSelectedApps.includes(appId)) {
        return prevSelectedApps.filter(id => id !== appId);
      } else {
        return [...prevSelectedApps, appId]
      }
    });
  };

  // script generation 
  const generateScript = async () => {
    if (selectedApps.length == 0 || !packageManager) return;

    setIsGenerating(true);
    try {
      const response = await fetch('../api/generate-script',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appIds: selectedApps,
            packageManager: packageManager
          }),
        }
      );

      // make temp url for download
      if (!response.ok) throw new Error("Failed to generate script.");
      const scriptBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(scriptBlob);
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl;
      downloadLink.download = `install_${packageManager}.sh`;

      // append + click -> cleanup
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      console.error("Script generation failed:", err);
      alert("Error generating script");

    } finally {
      setIsGenerating(false);
    }

  }

  return (
    <div className={styles.appGridContainer}>

      {/* select package manager */}
      <div className={styles.packageManagerSelectorWrapper}>
        <label>Package Manager: </label>
        <select
          className={styles.packageManagerSelect}
          value={packageManager ?? ''}
          onChange={(e) => setPackageManager(e.target.value as any)}
        >
          <option value=""> Select</option>
          <option value="apt">apt</option>
          <option value="dnf">dnf</option>
          <option value="pacman">pacman</option>
        </select>
      </div>

      {/* layout */}
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

        {/* generate & dl script*/}
      </div>
      <button
        className={styles.generateButton}
        onClick={generateScript}
        disabled={!packageManager || selectedApps.length === 0 || isGenerating}
      >
        {isGenerating ? 'Generating...' : `Download Script (${selectedApps.length})`}
      </button>
      <div className={styles.info}>
        <p>🛈 Always check scripts before running them.</p>
      </div>
    </div>
  );
}