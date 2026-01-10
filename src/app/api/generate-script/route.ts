import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// package manager keys based on db
type PackageManager =
  | "ubuntu"
  | "fedora"
  | "arch"
  | "opensuse"
  | "nix"
  | "flatpak"
  | "snap";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appIds, packageManager } = body as {
      appIds: number[];
      packageManager: PackageManager;
    };

    if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
      return new NextResponse("No apps selected", { status: 400 });
    }
    if (!process.env.DATABASE_URL) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const sql = neon(process.env.DATABASE_URL);

    // prevents fetching unnecessary data by selecting specific col needed for chosen package manager
    const apps = await sql`
            SELECT ${sql(packageManager)}
            FROM packages
            WHERE id = ANY(${appIds})
        `;

    const packagesToInstall: string[] = [];

    for (const app of apps) {
      const pkgName = app[packageManager];
      if (pkgName) {
        packagesToInstall.push(pkgName);
      }
    }

    if (packagesToInstall.length === 0) {
      return new NextResponse(
        "None of the selected apps are available for this package manager.",
        { status: 400 },
      );
    }

    let scriptContent = `#!/bin/bash\n\n`;
    scriptContent += `# Install Script generated on ${new Date().toISOString()}\n`;
    scriptContent += `# Manager: ${packageManager}\n`;
    scriptContent += `# Apps: ${packagesToInstall.length}\n\n`;
    scriptContent += `set -e\n\n`; // Exit on error

    const packageListString = packagesToInstall.join(" ");

    switch (packageManager) {
      case "ubuntu": // apt
        scriptContent += `echo "Updating apt repositories..."\n`;
        scriptContent += `sudo apt update\n\n`;
        scriptContent += `echo "Installing packages..."\n`;
        scriptContent += `sudo apt install -y ${packageListString}\n`;
        break;

      case "fedora": // dnf
        scriptContent += `echo "Installing packages..."\n`;
        scriptContent += `sudo dnf install -y ${packageListString}\n`;
        break;

      case "arch": // pacman
        scriptContent += `echo "Installing packages..."\n`;
        scriptContent += `sudo pacman -S --needed --noconfirm ${packageListString}\n`;
        break;

      case "opensuse": // zypper
        scriptContent += `echo "Installing packages..."\n`;
        scriptContent += `sudo zypper install -y ${packageListString}\n`;
        break;

      case "nix": // nix-env
        scriptContent += `echo "Installing packages..."\n`;
        const nixPackages = packagesToInstall
          .map((p) => `nixpkgs.${p}`)
          .join(" ");
        scriptContent += `nix-env -iA ${nixPackages}\n`;
        break;

      case "flatpak":
        scriptContent += `echo "Ensuring Flathub repo exists..."\n`;
        scriptContent += `flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo\n\n`;
        scriptContent += `echo "Installing Flatpaks..."\n`;
        scriptContent += `flatpak install flathub -y ${packageListString}\n`;
        break;

      case "snap":
        scriptContent += `echo "Installing Snaps..."\n`;
        scriptContent += `\n# Loop used for Snaps to handle --classic flags if needed in future, simpler for now:\n`;
        packagesToInstall.forEach((pkg) => {
          scriptContent += `sudo snap install ${pkg}\n`;
        });
        break;

      default:
        return new NextResponse("Invalid Package Manager", { status: 400 });
    }

    scriptContent += `\necho "---------------------------------"\n`;
    scriptContent += `echo "Installation Complete!"\n`;

    return new NextResponse(scriptContent, {
      headers: {
        "Content-Type": "application/x-sh",
        "Content-Disposition": `attachment; filename="install_${packageManager}.sh"`,
      },
    });
  } catch (error) {
    console.error("Script generation error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
