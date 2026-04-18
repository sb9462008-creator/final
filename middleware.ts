import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Authenticate via Stack Auth only (no Prisma in edge runtime)
  const user = await stackServerApp.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Inject user ID — org context will be resolved in each page/action
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.id);

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/add-product/:path*",
    "/settings/:path*",
    "/org/:path*",
  ],
};
