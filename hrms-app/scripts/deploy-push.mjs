import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const appDir = path.resolve(__dirname, '..')
const innerRepoDir = path.resolve(appDir, '..')
const outerRepoDir = path.resolve(innerRepoDir, '..')

console.log('🚀 [Deploy & Push] Starting automated deployment check & push...')
console.log(`📁 App Dir: ${appDir}`)
console.log(`📁 Inner Repo: ${innerRepoDir}`)
console.log(`📁 Outer Repo: ${outerRepoDir}`)

const result = {
  timestamp: new Date().toISOString(),
  steps: [],
  success: false,
  error: null,
}

function cleanLock(repoPath) {
  const lock = path.resolve(repoPath, '.git/index.lock')
  if (fs.existsSync(lock)) {
    try {
      fs.unlinkSync(lock)
      console.log(`🧹 Removed stale lock: ${lock}`)
      result.steps.push({ step: 'clean lock', path: lock, status: 'removed' })
    } catch (e) {
      console.warn(`⚠️ Could not remove lock ${lock}:`, e.message)
    }
  }
}

try {
  // 1. Clean locks
  cleanLock(innerRepoDir)
  cleanLock(outerRepoDir)

  // 2. TypeScript build check
  console.log('🔍 Running TypeScript verification (tsc -b)...')
  try {
    const tscOut = execSync('npx tsc -b', { cwd: appDir, encoding: 'utf8', stdio: 'pipe' })
    result.steps.push({ step: 'tsc -b', output: tscOut || 'Typecheck passed' })
    console.log('✅ TypeScript check passed.')
  } catch (tscErr) {
    const out = ((tscErr.stdout || '') + '\n' + (tscErr.stderr || '')).trim() || tscErr.message
    result.steps.push({ step: 'tsc -b check failed', output: out })
    console.error('❌ TypeScript errors found:\n', out)
    fs.writeFileSync(path.resolve(appDir, 'tsc-error.txt'), out)
    throw new Error(`TypeScript check failed:\n${out}`)
  }

  // 3. Inner repository git operations
  console.log('📦 Updating inner repository (HRMS_app-main)...')
  cleanLock(innerRepoDir)
  const innerStatus = execSync('git status --short', { cwd: innerRepoDir, encoding: 'utf8' })
  result.steps.push({ step: 'inner git status', output: innerStatus })
  console.log('Status:\n' + (innerStatus || '(clean)'))

  execSync('git add -A', { cwd: innerRepoDir, encoding: 'utf8' })
  result.steps.push({ step: 'inner git add -A', output: 'ok' })

  const commitMsg = 'feat: optimize SMTP queue resilience, priority candidate alerts, and recruitment email pipeline'
  try {
    const commitOut = execSync(`git commit -m "${commitMsg}"`, { cwd: innerRepoDir, encoding: 'utf8' })
    result.steps.push({ step: 'inner git commit', output: commitOut })
    console.log('✅ Committed changes.')
  } catch (cErr) {
    console.log('ℹ️ Inner repo: Nothing new to commit or already up to date.')
    result.steps.push({ step: 'inner git commit', note: 'Nothing to commit' })
  }

  console.log('🌐 Pushing inner repo to origin main (triggers GitHub Actions Pages deployment)...')
  const pushOut = execSync('git push origin main', { cwd: innerRepoDir, encoding: 'utf8', timeout: 60000 })
  result.steps.push({ step: 'inner git push origin main', output: pushOut })
  console.log('✅ Inner repo pushed successfully.')

  // 4. Outer repository git operations
  if (fs.existsSync(path.resolve(outerRepoDir, '.git'))) {
    console.log('📦 Updating outer workspace repository...')
    cleanLock(outerRepoDir)
    const outerStatus = execSync('git status --short', { cwd: outerRepoDir, encoding: 'utf8' })
    result.steps.push({ step: 'outer git status', output: outerStatus })

    execSync('git add -A', { cwd: outerRepoDir, encoding: 'utf8' })
    try {
      const outerCommit = execSync(`git commit -m "${commitMsg}"`, { cwd: outerRepoDir, encoding: 'utf8' })
      result.steps.push({ step: 'outer git commit', output: outerCommit })
    } catch {
      result.steps.push({ step: 'outer git commit', note: 'Nothing to commit' })
    }

    try {
      const outerPushOrigin = execSync('git push origin main', { cwd: outerRepoDir, encoding: 'utf8', timeout: 60000 })
      result.steps.push({ step: 'outer git push origin main', output: outerPushOrigin })
      console.log('✅ Outer repo pushed to origin main.')
    } catch (e) {
      result.steps.push({ step: 'outer git push origin main', note: e.message })
    }

    try {
      const outerPushNygenx = execSync('git push nygenx main', { cwd: outerRepoDir, encoding: 'utf8', timeout: 60000 })
      result.steps.push({ step: 'outer git push nygenx main', output: outerPushNygenx })
      console.log('✅ Outer repo pushed to nygenx main.')
    } catch (e) {
      result.steps.push({ step: 'outer git push nygenx main', note: e.message })
    }
  }

  result.success = true
  console.log('🎉 [Deploy & Push] Completed successfully!')
} catch (err) {
  result.error = err.message
  console.error('❌ [Deploy & Push] Failed:', err.message)
} finally {
  fs.writeFileSync(path.resolve(appDir, 'git-push-result.json'), JSON.stringify(result, null, 2))
}

