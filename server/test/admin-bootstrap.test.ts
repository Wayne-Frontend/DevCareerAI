import { deepEqual } from 'node:assert/strict'
import { test } from 'node:test'
import { parseAdminEmails } from '../src/modules/auth/admin-bootstrap.service'

test('parseAdminEmails 空值返回空数组', () => {
  deepEqual(parseAdminEmails(undefined), [])
  deepEqual(parseAdminEmails(''), [])
})

test('parseAdminEmails 去空白、转小写、去重、过滤空项', () => {
  deepEqual(parseAdminEmails(' Me@Example.com , ops@example.com ,, ME@example.com '), [
    'me@example.com',
    'ops@example.com',
  ])
})
