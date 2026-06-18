import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/** Public: list tim SE. Optional ?tipe=struktural|pj_kecamatan */
export async function GET(req: NextRequest) {
  const tipe = req.nextUrl.searchParams.get('tipe')
  try {
    const where = tipe && ['struktural', 'pj_kecamatan'].includes(tipe) ? 'WHERE tipe = ?' : ''
    const [rows] = await pool.execute(
      `SELECT id, nama, peran, foto, tipe, kdkec, nmkec, urutan FROM tim_se ${where} ORDER BY tipe, urutan, nama`,
      tipe ? [tipe] : [],
    ) as [any[], any]
    return NextResponse.json({ data: rows })
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message }, { status: 500 })
  }
}
