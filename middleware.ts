import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Middleware logic ที่จะทำงานหลังจาก authentication ผ่าน
    console.log("Authenticated user accessing:", req.nextUrl.pathname);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // ตรวจสอบว่า user มี token หรือไม่
        const { pathname } = req.nextUrl;
        
        // อนุญาตให้เข้าหน้า login และ register โดยไม่ต้อง login
        if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
          return true;
        }
        
        // หน้าอื่นๆ ต้องมี token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (image files in public folder)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|images/|uploads/).*)',
  ],
};
