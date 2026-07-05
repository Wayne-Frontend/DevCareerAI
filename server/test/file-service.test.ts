import { equal, ok, rejects } from 'node:assert/strict'
import { test } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { FileService } from '../src/modules/file/file.service'
import { MAX_PARSED_TEXT_LENGTH } from '../src/common/utils/text-limit.util'

function buildFile(originalname: string, buffer: Buffer): Express.Multer.File {
  return { originalname, buffer } as Express.Multer.File
}

const service = new FileService()

test('parse：缺少文件时报 400', async () => {
  await rejects(
    () => service.parse(undefined as unknown as Express.Multer.File),
    BadRequestException,
  )
})

test('parse：不支持的扩展名（exe）报 400', async () => {
  await rejects(
    () => service.parse(buildFile('malware.exe', Buffer.from('hello'))),
    BadRequestException,
  )
})

test('parse：扩展名与文件内容魔数不符（伪造 pdf）报 400，不进入解析器', async () => {
  // 纯文本内容配 .pdf 扩展名：魔数校验（%PDF）应在 pdf-parse 之前拦下
  await rejects(
    () => service.parse(buildFile('resume.pdf', Buffer.from('plain text, not a pdf'))),
    BadRequestException,
  )
})

test('parse：txt 正常解析，超长内容被截断并标记 truncated', async () => {
  const long = 'a'.repeat(MAX_PARSED_TEXT_LENGTH + 100)

  const result = await service.parse(buildFile('notes.txt', Buffer.from(long, 'utf8')))

  equal(result.fileType, 'txt')
  equal(result.truncated, true)
  equal(result.content.length, MAX_PARSED_TEXT_LENGTH)
})

test('parse：短文本不截断，内容原样返回', async () => {
  const result = await service.parse(buildFile('readme.md', Buffer.from('# 标题\n正文', 'utf8')))

  equal(result.truncated, false)
  equal(result.content, '# 标题\n正文')
})

test('parse：multer 以 latin1 传递的中文文件名被还原为 UTF-8', async () => {
  // multer 把 UTF-8 文件名按 latin1 解读，这里模拟同样的损坏方式
  const mangled = Buffer.from('简历.txt', 'utf8').toString('latin1')

  const result = await service.parse(buildFile(mangled, Buffer.from('内容', 'utf8')))

  equal(result.fileName, '简历.txt')
})

test('parse：本就合法的 ASCII 文件名不受解码影响', async () => {
  const result = await service.parse(buildFile('resume-v2.txt', Buffer.from('text', 'utf8')))

  ok(result.fileName === 'resume-v2.txt')
})
