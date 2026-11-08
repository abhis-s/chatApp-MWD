const userAgent = process.env.npm_config_user_agent || '';
const execPath = process.env.npm_execpath || '';
const isPnpm = userAgent.includes('pnpm') || execPath.includes('pnpm') || !!process.env.PNPM_SCRIPT_SRC_DIR;

if (!isPnpm) {
    console.error('\n\x1b[31m[ERROR] This project strictly requires PNPM. Please run: pnpm install\x1b[0m\n');
    process.exit(1);
}
