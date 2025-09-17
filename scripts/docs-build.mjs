import { spawnSync } from 'node:child_process'

const env = { ...process.env }
const limit = Number(env.P_LIMT_MAX)
if (!Number.isFinite(limit) || limit < 1) {
  env.P_LIMT_MAX = '4'
}

const result = spawnSync('npx vitepress build docs', {
  stdio: 'inherit',
  env,
  shell: true
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
