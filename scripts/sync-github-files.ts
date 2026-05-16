import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

async function fetchFromGithub(pathRef: string) {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set in the environment.');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: pathRef,
      method: 'GET',
      headers: {
        'User-Agent': 'AI-Studio-Agent',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API Error: ${res.statusCode} ${res.statusMessage} - ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

function download(url: string, dest: string) {
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const options = {
            headers: {
                'User-Agent': 'AI-Studio-Agent',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode && res.statusCode >= 300) {
               reject(`Failed: ${res.statusCode} ${res.statusMessage}`);
               return;
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(true);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log('Fetching tree...');
        const repoInfo: any = await fetchFromGithub('/repos/devPSA-Business/PSA-Business-Suite');
        const branchInfo: any = await fetchFromGithub(`/repos/devPSA-Business/PSA-Business-Suite/branches/${repoInfo.default_branch}`);
        const latestCommitSha = branchInfo.commit.sha;
        const treeInfo: any = await fetchFromGithub(`/repos/devPSA-Business/PSA-Business-Suite/git/trees/${latestCommitSha}?recursive=1`);
        
        const ghOnlyPaths = [
            ".github/CODEOWNERS",
            ".github/workflows/branch-protection.yml",
            ".github/workflows/ci-quality-gate.yml",
            ".github/workflows/codeql-analysis.yml",
            ".github/workflows/firebase-deploy.yml",
            ".github/workflows/forensic-audit.yml",
            ".github/workflows/security-check.yml",
            ".github/workflows/security-scan.yml",
            "Audit file",
            "PSA_Audit_Fixes.zip",
            "api/index.ts",
            "psa-smart-fix.sh"
        ];

        for (const file of treeInfo.tree) {
            if (ghOnlyPaths.includes(file.path)) {
                // Determine absolute path in local workspace
                const dest = path.join(process.cwd(), file.path);
                if (fs.existsSync(dest)) {
                    console.log(`Skipping ${file.path}, already exists locally.`);
                    continue;
                }
                console.log(`Downloading ${file.path} to ${dest}...`);
                try {
                   await download(file.url, dest);
                   console.log(`Success: ${file.path}`);
                } catch(e) {
                   console.log(`Error downloading ${file.path}:`, e);
                }
            }
        }
    } catch (e: any) {
        console.log("Error:", e.message);
    }
}
main();
