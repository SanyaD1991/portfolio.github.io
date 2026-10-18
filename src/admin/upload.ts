import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/compressImage'

export const MAX_FILE_MB = 25

export type UploadKind = 'image' | 'pdf'

export function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function uploadMedia(file: File, userId: string, kind: UploadKind = 'image'): Promise<string> {
  if (kind === 'image' && !file.type.startsWith('image/')) throw new Error('Нужно изображение: JPG, PNG или WebP.')
  if (kind === 'pdf' && !isPdf(file)) throw new Error('Нужен PDF-файл.')
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Файл больше ${MAX_FILE_MB} МБ. Уменьшите его и попробуйте снова.`)

  const prepared = kind === 'image' ? (await compressImage(file)).file : file
  const extension = prepared.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (kind === 'pdf' ? 'pdf' : 'jpg')
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  const { error } = await supabase.storage.from('portfolio-media').upload(path, prepared, {
    upsert: false,
    contentType: prepared.type || undefined,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('portfolio-media').getPublicUrl(path).data.publicUrl
}

export async function saveOrder(table: 'portfolios' | 'sections' | 'projects' | 'achievements', items: { id: string; sort_order: number }[]) {
  const results = await Promise.all(
    items.map((item, index) => {
      const sort_order = (index + 1) * 10
      return item.sort_order === sort_order
        ? Promise.resolve({ error: null })
        : supabase.from(table).update({ sort_order }).eq('id', item.id)
    }),
  )
  return results.find((result) => result.error)?.error ?? null
}
