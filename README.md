This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server (HTTPS, PC·휴대폰 접속 가능):

```bash
npm run dev
```

- **PC**: 브라우저에서 [https://localhost:3000](https://localhost:3000) 접속 (자체 서명 인증서 경고 시 "고급" → "계속" 선택)
- **휴대폰**: PC와 같은 Wi‑Fi에 연결한 뒤, 터미널에 표시되는 **Network URL** (예: `https://192.168.x.x:3000`) 로 접속. 자체 서명 인증서 경고 시 "고급" → "계속" 선택

HTTP만 사용하려면: `npm run dev:http` 후 [http://localhost:3000](http://localhost:3000) 접속.

### 환경 변수

`.env.example`을 참고해 프로젝트 루트에 `.env.local`을 만들고 다음을 설정하세요.

- `MONGODB_URI`: MongoDB 연결 문자열 (예: `mongodb+srv://...`)
- `JWT_SECRET`: 로그인 세션 서명용 시크릿 (32자 이상 랜덤 문자열 권장)

### 관리자 계정

- **회원가입**은 항상 **일반** 사용자로 생성됩니다.
- **관리자** 계정이 필요하면 MongoDB에서 `users` 컬렉션에 문서를 직접 추가하세요.
  - `userId`: 로그인 ID
  - `password`: [bcrypt](https://www.npmjs.com/package/bcryptjs)로 해시한 비밀번호
  - `userType`: `"admin"`
  - `createdAt`: `new Date()` (선택)

Open [https://localhost:3000](https://localhost:3000) (or the Network URL from the terminal) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
