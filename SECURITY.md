# Security Policy

We take the security of this project and the safety of our users' data seriously. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner.

---

## Supported Versions

Only the latest release and current default branch receive security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, or public discussions.**

Instead, please report vulnerabilities using one of the following methods:

1. **GitHub Private Vulnerability Reporting (Recommended):**
   - Navigate to the **Security** tab of this repository.
   - Click on **Advisories** and select **"Report a vulnerability"**.
   - Fill out the details in the confidential form.

2. **Direct Email:**
   - Send an email to **`raghavw2006@gmail.com`**.
   - Use the subject line: `[SECURITY] Potential vulnerability in <repository-name>`.

### What to Include in Your Report

To help us triage and resolve the issue quickly, please provide as much information as possible:

- **Description:** A detailed description of the vulnerability and its potential impact.
- **Affected Components:** The exact files, routes, functions, or dependencies involved.
- **Proof of Concept (PoC):** Step-by-step instructions, scripts, screenshots, or curl requests to reproduce the vulnerability.
- **Mitigation / Suggested Fix:** (Optional) Any recommendations on how to remediate the issue.

---

## Response Process & Timeline

When a report is received, we commit to the following schedule:

- **Acknowledgment:** Within **48 hours** of receiving your report.
- **Initial Assessment:** Within **5 business days** confirming the validity and severity of the vulnerability.
- **Remediation & Patching:** High/Critical severity issues are prioritized for prompt resolution. We will coordinate a release date with the reporter.
- **Public Disclosure:** Details of the vulnerability will only be published after a fix or mitigation has been deployed.

---

## Safe Harbor / Responsible Disclosure

If you make a good faith effort to comply with this policy when conducting security research:

- We will consider your research authorized and will not pursue legal action against you.
- We will work with you to understand and resolve the issue quickly.
- We request that you give us a reasonable amount of time to remediate the issue before sharing any information publicly.

---

## Security Best Practices for Deployments

If you are deploying or self-hosting this application:

- **Environment Secrets:** Never commit `.env` files, API keys, or private service account tokens to version control.
- **Database & Storage Rules:** Verify that Firestore and storage rules enforce proper authentication and authorization checks.
- **Dependencies:** Regularly audit installed packages using `npm audit`.
