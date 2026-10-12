import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

/**
 * Derives a clean numeric sequence from an employee code (e.g. "OKL-GEN-2026-107" -> 107).
 */
export function extractEmployeeNumber(employeeCode?: string | null): number {
  if (!employeeCode) return 101
  const matches = employeeCode.match(/\d+$/) || employeeCode.match(/\d+/)
  if (matches && matches[0]) {
    const num = parseInt(matches[0], 10)
    if (!isNaN(num) && num > 0) return num
  }
  // Fallback hash
  let hash = 0
  for (let i = 0; i < employeeCode.length; i++) {
    hash = (hash * 31 + employeeCode.charCodeAt(i)) % 900
  }
  return 100 + Math.abs(hash)
}

/**
 * Generates a unique, standardized Laptop Code (e.g. "LP-2026-107" or "LP-107").
 */
export function generateLaptopCode(employeeCode?: string | null, customSerial?: string | null): string {
  if (customSerial && customSerial.trim()) {
    return customSerial.trim()
  }
  const num = extractEmployeeNumber(employeeCode)
  return `LP-2026-${String(num).padStart(3, '0')}`
}

/**
 * Generates an official Seating Number allocated according to Employee ID.
 * Formula:
 * - Floor 1 for 1-50, Floor 2 for 51-100, Floor 3 for 101-150, etc.
 * - Bay A through F
 * - Desk number matching employee sequence
 */
export function generateSeatingNumber(employeeCode?: string | null): {
  seatId: string
  floor: string
  bay: string
  fullLocation: string
} {
  const num = extractEmployeeNumber(employeeCode)
  const floorNum = Math.floor((num - 1) / 50) + 1
  const bayLetter = String.fromCharCode(65 + (Math.floor((num - 1) / 10) % 6))
  const seatId = `S-${num}`
  const fullLocation = `Floor ${floorNum} · Bay ${bayLetter} · Seat #${num}`

  return {
    seatId,
    floor: `Floor ${floorNum}`,
    bay: `Bay ${bayLetter}`,
    fullLocation,
  }
}

/**
 * Generates an official Parking Slot allocated according to Employee ID.
 */
export function generateParkingSlot(employeeCode?: string | null): {
  slotId: string
  level: string
  fullLocation: string
} {
  const num = extractEmployeeNumber(employeeCode)
  const level = num % 2 === 0 ? 'Basement 1 (B1)' : 'Basement 2 (B2)'
  const slotId = `P-${String(num).padStart(3, '0')}`
  const fullLocation = `${level} · Slot ${slotId}`

  return {
    slotId,
    level,
    fullLocation,
  }
}

/**
 * Generates the complete, human-readable text payload containing all 5 employee & hardware details.
 * When scanned by Google Lens or a phone camera, this entire multiline text appears on the phone screen.
 */
export function generateFullAssetDetailsText(params: {
  employeeName: string
  employeeId: string
  employeeEmail: string
  laptopCode: string
  seatingNumber: string
  department?: string
}): string {
  return `=== OKLUT IT ASSET TAG ===
Laptop ID: ${params.laptopCode}
Employee Name: ${params.employeeName}
Employee ID: ${params.employeeId}
Employee Mail: ${params.employeeEmail}
${params.department ? `Department: ${params.department}\n` : ''}Seating Number: ${params.seatingNumber}
Status: Verified Active IT Asset`
}

/**
 * Generates ASCII text for Code 128 barcodes containing all 5 employee details.
 */
export function generateFullAssetBarcodeText(params: {
  employeeName: string
  employeeId: string
  employeeEmail: string
  laptopCode: string
  seatingNumber: string
}): string {
  const cleanSeat = params.seatingNumber.replace(/·/g, '-')
  return `Name: ${params.employeeName} | ID: ${params.employeeId} | Mail: ${params.employeeEmail} | Laptop: ${params.laptopCode} | Seating: ${cleanSeat}`
}

/**
 * Generates a Barcode Data URL (PNG/JPEG) using JsBarcode.
 */
export function generateBarcodeDataUrl(
  text: string,
  options?: { displayValue?: boolean; width?: number; height?: number }
): string {
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, text, {
      format: 'CODE128',
      lineColor: '#0f172a',
      width: options?.width ?? (text.length > 25 ? 1.4 : 2),
      height: options?.height ?? (text.length > 25 ? 65 : 60),
      displayValue: options?.displayValue ?? (text.length <= 25),
      fontSize: 13,
      font: 'monospace',
      textMargin: 4,
      margin: 8,
      background: '#ffffff',
    })
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation error:', err)
    return ''
  }
}

/**
 * Generates a QR Code Data URL asynchronously.
 */
export async function generateQrCodeDataUrl(text: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      ...options,
    })
  } catch (err) {
    console.error('QR code generation error:', err)
    return ''
  }
}
