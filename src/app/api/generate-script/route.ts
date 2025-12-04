import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { appIds, packageManager } = body;

        // validate server side as well
        if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
            return new NextResponse('No apps selected', { status: 400 });
        }
        if (!process.env.DATABASE_URL) {
            return new NextResponse('Server configuration error', { status: 500 });
        }

        const sql = neon(process.env.DATABASE_URL);
        const apps = await sql`
            SELECT apt_name, dnf_name, pacman_name 
            FROM app_catalog 
            WHERE id = ANY(${appIds})
        `;

        // extract the chosen package names 
        // filter nulls in case app doesn't support the selected system
        const packagesToInstall: string[] = [];

        for (const app of apps) {
            let pkgName: string | null = null;

            if (packageManager === 'apt') pkgName = app.apt_name;
            else if (packageManager === 'dnf') pkgName = app.dnf_name;
            else if (packageManager === 'pacman') pkgName = app.pacman_name;

            if (pkgName) {
                packagesToInstall.push(pkgName);
            }
        }

        if (packagesToInstall.length === 0) {
            return new NextResponse('None of the selected apps are available for this package manager.', { status: 400 });
        }

        // make bash script
        const packageListString = packagesToInstall.join(' ');
        let scriptContent = `#!/bin/bash\n\n`;
        scriptContent += `# Install Script generated on ${new Date().toISOString()}\n`;
        scriptContent += `# Apps: ${packagesToInstall.length}\n\n`;

        // error handling (stop script if a command fails)
        scriptContent += `set -e\n\n`;

        if (packageManager === 'apt') {
            scriptContent += `echo "Updating apt repositories..."\n`;
            scriptContent += `sudo apt update\n\n`;
            scriptContent += `echo "Installing packages..."\n`;
            scriptContent += `sudo apt install -y ${packageListString}\n`;
        } 
        else if (packageManager === 'dnf') {
            scriptContent += `echo "Installing packages..."\n`;
            scriptContent += `sudo dnf install -y ${packageListString}\n`;
        } 
        else if (packageManager === 'pacman') {
            scriptContent += `echo "Installing packages..."\n`;
            scriptContent += `sudo pacman -S --noconfirm ${packageListString}\n`;
        }

        scriptContent += `\necho "---------------------------------"\n`;
        scriptContent += `echo "Installation Complete!"\n`;

        // return file
        return new NextResponse(scriptContent, {
            headers: {
                'Content-Type': 'application/x-sh',
                'Content-Disposition': `attachment; filename="install_${packageManager}.sh"`,
            },
        });

    } catch (error) {
        console.error('Script generation error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}