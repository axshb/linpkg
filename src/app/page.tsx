import styles from "./page.module.css";
import { AppGridDisplay } from "./components/AppGridDisplay";
import { getAppCatalogItems, AppCatalogItem } from "./lib/data";

export default async function Home() {

  let apps: AppCatalogItem[] = [];

  try {
    apps = await getAppCatalogItems();
  } catch (e) {
    console.error("Failed to get app catalog data:", e instanceof Error ? e.message : e);
    return <div className={styles.page}>Error loading applications.</div>
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>

        <div className={styles.intro}>
          <h1>linpkg</h1>
          <p>Select your package manager and the packages you would like to install.</p>
        </div>
        <AppGridDisplay apps={apps} />
      </main>
    </div>
  );
}