import { generateToken } from '../src/lib/utils'

test('generateToken returns a non-empty string', () => {
  const t = generateToken()
  expect(typeof t).toBe('string')
  expect(t.length).toBeGreaterThan(5)
})

