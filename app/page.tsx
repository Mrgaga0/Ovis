import { redirect } from 'next/navigation';

export default function Home() {
  // 메인 페이지 접속 시 에이전트 관리 페이지로 리디렉션
  redirect('/agents');
} 