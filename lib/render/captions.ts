/**
 * Captions generator — converts StoryboardOutput scenes to SRT format.
 * Each scene's voiceover becomes a subtitle timed to the scene duration.
 *
 * Also exports a JSON captions format (for future overlay / app use).
 */
import type { StoryboardOutput } from '@/lib/ai'
import fs from 'fs'
import path from 'path'

export interface CaptionEntry {
  index: number
  startSec: number
  endSec: number
  text: string
}

/** Parse duration strings: "3s", "5s", "00:00:03", "3" → seconds */
function parseDuration(raw: string): number {
  const trimmed = raw.trim()
  // "3s", "3.5s"
  const secMatch = trimmed.match(/^(\d+(?:\.\d+)?)s?$/)
  if (secMatch) return parseFloat(secMatch[1])
  // "00:00:03" or "0:03"
  const parts = trimmed.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 3 // fallback: 3 seconds
}

/** Format seconds as SRT timestamp: 00:00:03,000 */
function toSRTTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':') + ',' + String(ms).padStart(3, '0')
}

/** Build caption entries from storyboard */
export function buildCaptions(storyboard: StoryboardOutput): CaptionEntry[] {
  let cursor = 0
  return storyboard.scenes.map((scene, i) => {
    const dur = parseDuration(scene.duration)
    const entry: CaptionEntry = {
      index: i + 1,
      startSec: cursor,
      endSec: cursor + dur,
      text: scene.voiceover || scene.text_overlay,
    }
    cursor += dur
    return entry
  })
}

/** Render entries as SRT string */
export function toSRT(entries: CaptionEntry[]): string {
  return entries
    .map(e =>
      `${e.index}\n${toSRTTime(e.startSec)} --> ${toSRTTime(e.endSec)}\n${e.text}`
    )
    .join('\n\n') + '\n'
}

/** Save SRT and JSON alongside a render output file.
 *  outputPath: /storage/renders/run_xxx.mp4
 *  Returns paths to both files.
 */
export function saveCaptions(
  storyboard: StoryboardOutput,
  outputPath: string
): { srtPath: string; jsonPath: string } {
  const base = outputPath.replace(/\.(mp4|mov|webm)$/i, '')
  const entries = buildCaptions(storyboard)

  const srtPath = base + '.srt'
  const jsonPath = base + '.captions.json'

  fs.writeFileSync(srtPath, toSRT(entries), 'utf8')
  fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2), 'utf8')

  return { srtPath, jsonPath }
}

/** Generate .srt file in storage/captions/ (standalone, no MP4 required) */
export function saveCaptionsStandalone(
  storyboard: StoryboardOutput,
  runId: string
): { srtPath: string; entries: CaptionEntry[] } {
  const dir = path.join(process.cwd(), 'storage', 'captions')
  fs.mkdirSync(dir, { recursive: true })
  const entries = buildCaptions(storyboard)
  const srtPath = path.join(dir, `${runId}.srt`)
  fs.writeFileSync(srtPath, toSRT(entries), 'utf8')
  return { srtPath, entries }
}
