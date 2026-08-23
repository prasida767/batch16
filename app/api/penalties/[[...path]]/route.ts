import { NextResponse } from "next/server";

function gone() {
  return new NextResponse(null, { status: 404 });
}

export function GET() {
  return gone();
}
export function POST() {
  return gone();
}
export function PUT() {
  return gone();
}
export function PATCH() {
  return gone();
}
export function DELETE() {
  return gone();
}
