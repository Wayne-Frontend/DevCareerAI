import { equal, ok } from 'node:assert/strict'
import { test } from 'node:test'
import {
  detectImageMime,
  looksLikeText,
  matchesDocumentSignature,
} from '../src/common/utils/file-signature.util'

function withSignature(signature: number[], padding = 32): Buffer {
  return Buffer.concat([Buffer.from(signature), Buffer.alloc(padding)])
}

test('matchesDocumentSignature 识别真实 PDF 头', () => {
  ok(matchesDocumentSignature(withSignature([0x25, 0x50, 0x44, 0x46]), 'pdf'))
})

test('matchesDocumentSignature 拒绝伪造扩展名的 PDF', () => {
  // 内容实为 PNG，却声称是 pdf
  ok(!matchesDocumentSignature(withSignature([0x89, 0x50, 0x4e, 0x47]), 'pdf'))
})

test('matchesDocumentSignature 识别 docx（zip 容器）头', () => {
  ok(matchesDocumentSignature(withSignature([0x50, 0x4b, 0x03, 0x04]), 'docx'))
})

test('matchesDocumentSignature 对 txt 用文本启发式放行', () => {
  ok(matchesDocumentSignature(Buffer.from('普通简历文本 hello world', 'utf8'), 'txt'))
})

test('matchesDocumentSignature 对含 NUL 的 md 判为非文本', () => {
  ok(!matchesDocumentSignature(Buffer.from([0x68, 0x69, 0x00, 0x69]), 'md'))
})

test('looksLikeText 空 buffer 视为文本', () => {
  ok(looksLikeText(Buffer.alloc(0)))
})

test('looksLikeText 允许换行与制表符', () => {
  ok(looksLikeText(Buffer.from('line1\r\n\tline2\n', 'utf8')))
})

test('detectImageMime 识别各图片类型', () => {
  equal(detectImageMime(withSignature([0xff, 0xd8, 0xff])), 'image/jpeg')
  equal(
    detectImageMime(withSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/png',
  )
  equal(detectImageMime(withSignature([0x47, 0x49, 0x46, 0x38])), 'image/gif')

  const webp = Buffer.concat([
    Buffer.from([0x52, 0x49, 0x46, 0x46]),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from([0x57, 0x45, 0x42, 0x50]),
  ])
  equal(detectImageMime(webp), 'image/webp')
})

test('detectImageMime 对非图片返回 null', () => {
  equal(detectImageMime(Buffer.from('not an image', 'utf8')), null)
})

test('detectImageMime 拒绝 RIFF 但非 WEBP 的文件', () => {
  const wav = Buffer.concat([
    Buffer.from([0x52, 0x49, 0x46, 0x46]),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from([0x57, 0x41, 0x56, 0x45]), // WAVE
  ])
  equal(detectImageMime(wav), null)
})
