import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: "ALUMNO" | "ADMIN";
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ALUMNO" | "ADMIN";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ALUMNO" | "ADMIN";
  }
}
