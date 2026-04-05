import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

// ─── Types ───────────────────────────────────────────────────
type SectionItem =
  | { type: 'heading'; text: string }
  | { type: 'body'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'note'; text: string };

interface Section {
  title: string;
  items: SectionItem[];
}

// ─── Content Data ────────────────────────────────────────────
const INTRO = `우다몬은 모든 사용자가 자신의 개인정보를 보호받을 권리를 가지고 있다고 믿으며, 사용자가 자신의 정보에 대한 권리를 안전하게 행사할 수 있도록 지원하고자 합니다.

본 개인정보처리방침은 주식회사 헤이디컴퍼니(이하 "회사", "당사" 또는 "저희")가 운영하는 우다몬 애플리케이션, 웹사이트(udamonfan.com) 및 기타 온라인 제품과 서비스(통칭하여 "서비스")를 이용하거나, 그 밖의 다른 방식으로 당사와 상호 작용할 때, 개인정보를 수집, 사용 및 공유하는 방법과 그 이유에 대한 이해를 돕기 위해 작성되었습니다.

방침 전문을 읽어보시기를 권하지만, 여의치 않으실 경우 다음의 핵심 요약을 참고하시기 바랍니다.`;

const SECTIONS: Section[] = [
  {
    title: '핵심 요약',
    items: [
      { type: 'heading', text: '우다몬은 팬 포토 공유 플랫폼입니다.' },
      { type: 'body', text: '우다몬은 KBO 야구 팬들이 경기장에서 촬영한 사진을 공유하고 포토그래퍼를 후원하는 커뮤니티 플랫폼입니다. 사용자의 프로필, 업로드한 사진, 좋아요 수, 팔로워 수는 공개됩니다. 게시물 작성 시 서비스의 이러한 공개적 특성을 고려하시기 바랍니다.' },
      { type: 'heading', text: '우다몬은 최소한의 개인정보를 수집합니다.' },
      { type: 'body', text: '우다몬은 서비스 제공에 필요한 최소한의 개인정보만 수집합니다. 회원가입 시 이메일 또는 소셜 로그인(Apple, Google, 카카오)만 필요하며, 실명은 요구되지 않습니다.' },
      { type: 'heading', text: '저희는 우다몬을 더 나은 공간으로 만들기 위해 데이터를 사용합니다.' },
      { type: 'body', text: '수집된 모든 데이터는 주로 야구 팬들이 함께 모여 커뮤니티를 형성할 수 있도록 지원하는 서비스 제공에 사용되며, 사용자의 개인정보를 데이터 브로커 기업을 포함한 외부 업체에 판매하지 않습니다.' },
      { type: 'heading', text: '모든 사용자는 개인정보를 보호받을 권리를 갖습니다.' },
      { type: 'body', text: '우다몬에서는 누구나 자신의 개인정보 사본 요청, 계정 삭제, 개인정보 처리방침에 대한 정보 요청이 가능합니다.' },
      { type: 'heading', text: '데이터 사용 방식에 대해 궁금한 점이 있다면 언제든지 문의해주세요.' },
      { type: 'body', text: '개인정보 처리방침은 최대한 이해하기 쉽게 작성되어 있으나, 헷갈리는 부분이 있을 수 있습니다. 본 방침이나 우다몬에 대해 궁금한 점이 있다면 cs@udamonfan.com으로 언제든지 문의해 주세요.' },
    ],
  },
  {
    title: '1. 우다몬은 공개 플랫폼입니다',
    items: [
      { type: 'body', text: '우다몬은 야구 팬 포토를 공유하는 공개 플랫폼입니다. 서비스에 게시된 대부분의 사진과 콘텐츠는 공개되어 있으며 계정 없이도 누구나 열람할 수 있습니다.' },
      { type: 'body', text: '서비스의 공개 영역에 콘텐츠(예: 사진, 댓글 등)를 제출할 경우, 해당 서비스의 방문자 및 사용자는 해당 콘텐츠와 관련 사용자 이름, 최초 제출 일자 및 시간을 볼 수 있습니다. 또한, 그러한 콘텐츠와 정보는 인터넷 검색 엔진의 검색 결과를 통해서도 제공될 수 있습니다. 따라서 콘텐츠 게시 시 당사 서비스의 이러한 공개적 특성을 고려하시기 바랍니다.' },
      { type: 'heading', text: '공개 프로필' },
      { type: 'body', text: '우다몬 계정에는 공개 프로필 페이지가 있습니다. 귀하의 프로필에는 다음 정보가 포함됩니다.' },
      { type: 'bullets', items: [
        '사용자 이름 (닉네임)',
        '프로필 사진 및 자기소개 (선택 입력 시)',
        '응원 팀 정보',
        '업로드한 사진',
        '좋아요 수 및 팔로워 수',
        '포토그래퍼 여부',
        '서비스 가입일',
      ] },
      { type: 'note', text: '후원 내역은 공개되지 않습니다.' },
    ],
  },
  {
    title: '2. 우다몬이 수집하는 정보',
    items: [
      { type: 'heading', text: '사용자가 직접 제공하는 정보' },
      { type: 'body', text: '당사는 귀하가 서비스를 이용할 때 직접적으로 제공한 정보를 수집합니다.' },
      { type: 'heading', text: '계정 정보' },
      { type: 'body', text: '우다몬 계정을 만들 경우, 다음의 정보가 수집됩니다.' },
      { type: 'table', headers: ['수집 시점', '수집 항목', '수집 목적'], rows: [
        ['이메일 가입', '이메일 주소, 비밀번호(암호화 저장), 닉네임', '계정 생성 및 본인 식별'],
        ['소셜 로그인 (Apple/Google/카카오)', '소셜 계정 고유 식별자(UID), 이메일 주소, 프로필 이름(제공 시)', '간편 로그인 및 계정 연동'],
        ['서비스 이용 중', '응원 팀, 프로필 사진, 자기소개', '맞춤형 콘텐츠 추천 및 프로필 표시'],
      ] },
      { type: 'body', text: '이메일 가입 시 비밀번호를 입력해야 하며, 소셜 로그인 시에는 별도의 비밀번호가 필요하지 않습니다. 또한, 더욱 관련성이 높은 콘텐츠를 추천하기 위해 계정 생성 시 응원 팀을 선택하도록 요청드리고 있습니다.' },
      { type: 'heading', text: '사용자가 제출한 공개 콘텐츠' },
      { type: 'body', text: '사용자가 제출한 공개 콘텐츠에는 사진, 댓글, 사용자 이름, 프로필 정보 및 관련 메타데이터가 포함됩니다. 특히 포토그래퍼가 업로드하는 사진에는 EXIF 데이터(촬영 일시, 카메라 정보 등)가 포함될 수 있으며, 당사는 서비스 품질 향상을 위해 이를 수집할 수 있습니다.' },
      { type: 'heading', text: '비공개 콘텐츠' },
      { type: 'body', text: '사용자가 제출한 비공개 콘텐츠에는 다른 사용자와의 비공개 메시지, 사용자 신고 내역, 고객 지원 요청 시 제출하는 정보가 포함됩니다.' },
      { type: 'heading', text: '사용자가 수행하는 작업' },
      { type: 'body', text: '우다몬은 서비스 이용 과정에서 사용자가 수행하는 다음과 같은 작업에 대한 정보를 수집합니다.' },
      { type: 'bullets', items: [
        '콘텐츠와의 상호 작용 (좋아요, 저장, 신고)',
        '다른 사용자와의 상호 작용 (팔로우, 차단)',
        '구단/선수별 콘텐츠 탐색 및 검색 기록',
        '포토그래퍼 후원 (티켓 구매 및 사용) 내역',
      ] },
      { type: 'heading', text: '거래 정보' },
      { type: 'body', text: '우다몬에서 티켓을 구매하여 포토그래퍼를 후원할 경우, 결제는 Paddle.com이 판매자 대행(Merchant of Record)으로서 처리합니다. 당사는 귀하의 신용카드 번호, 계좌 정보 등 결제 수단 정보를 직접 수집하거나 저장하지 않습니다.' },
      { type: 'body', text: '당사는 결제 완료 여부, 거래 ID, 결제 금액, 결제 일시 등 거래 확인에 필요한 최소한의 정보만 수신합니다.' },
      { type: 'heading', text: '서비스 이용에 따라 자동 수집되는 정보' },
      { type: 'body', text: '당사는 귀하가 서비스를 이용할 때 자동으로 정보를 수집합니다.' },
      { type: 'heading', text: '로그 데이터' },
      { type: 'body', text: '당사는 귀하가 서비스에 액세스하여 이용할 때 다음의 기기 및 네트워크 연결 정보를 수집합니다.' },
      { type: 'bullets', items: [
        'IP 주소',
        '사용자 에이전트 문자열, 브라우저 유형, 운영 체제',
        '기기 정보 (기기 ID, 기종, OS 버전)',
        '이동통신사 이름',
      ] },
      { type: 'body', text: '당사는 수집된 IP 주소를 서비스 이용 기록 보관 기간(최대 1년) 경과 후 삭제합니다.' },
      { type: 'heading', text: '이용 정보' },
      { type: 'body', text: '방문한 페이지, 콘텐츠와 상호 작용한 방식, 좋아요한 사진, 클릭한 링크, 검색어와 같은 귀하의 서비스 이용 내역에 대한 정보를 수집합니다.' },
      { type: 'heading', text: '쿠키 및 유사 기술' },
      { type: 'body', text: '당사는 쿠키 및 유사 기술을 통해 정보를 수집할 수 있습니다. 이러한 정보는 서비스 제공 및 유지 관리, 사용자 경험 개선, 사용자 활동 파악, 콘텐츠 개인화, 광고 효과 측정, 서비스 품질 향상을 위해 사용됩니다.' },
      { type: 'heading', text: '위치 정보' },
      { type: 'body', text: '로그 데이터의 IP 주소에 기반하여 귀하의 대략적인 위치(도시 수준)를 자동 수집합니다. 당사는 GPS 기반의 정확한 위치를 추적하지 않습니다.' },
      { type: 'heading', text: '광고 식별자' },
      { type: 'body', text: '사용자 동의 시 광고 식별자(IDFA/GAID)를 수집하여 Google AdMob을 통한 맞춤형 광고 제공에 사용합니다.' },
      { type: 'heading', text: '포토그래퍼 전환 시 추가 수집 정보' },
      { type: 'body', text: '팬 회원이 포토그래퍼 계정으로 전환할 경우, 후원금 정산을 위해 다음의 추가 정보가 수집됩니다.' },
      { type: 'bullets', items: [
        '정산 계좌 정보 (은행명, 계좌번호, 예금주)',
        '세금 처리를 위한 주민등록번호 (원천징수 목적, 암호화 저장)',
        '연락처 (정산 관련 안내용)',
      ] },
      { type: 'body', text: '해당 정보는 후원금 정산 및 세무 처리 목적으로만 사용되며, 정산 종료 및 관련 법령에 따른 보관 기간 경과 후 파기됩니다.' },
    ],
  },
  {
    title: '3. 우다몬의 개인정보 사용 방식',
    items: [
      { type: 'body', text: '수집된 개인정보는 다음과 같은 용도로 사용됩니다.' },
      { type: 'bullets', items: [
        '서비스의 제공, 유지 및 개선',
        '사용자의 응원 팀, 관심 선수를 고려한 맞춤형 콘텐츠 및 피드 제공',
        '포토그래퍼 후원금 결제 처리 및 정산',
        'Google AdMob을 통한 맞춤형 광고 제공 및 광고 효과 측정',
        '스팸 방지, 악용 사례 해결, 특정 콘텐츠 관리, 이용 약관 및 커뮤니티 가이드라인 시행',
        '관련 법률 준수 (세금 신고, 전자상거래 기록 보존 등)',
        '신규 서비스 연구 및 개발',
        '기술 관련 공지, 업데이트, 보안 알림 발송',
        '고객 서비스 제공',
        '사용자 동의 시 이벤트, 프로모션 안내 (푸시 알림, 이메일, 인앱 메시지)',
        '서비스와 관련된 트렌드, 사용량, 활동 모니터링 및 분석',
      ] },
    ],
  },
  {
    title: '4. 우다몬의 개인정보 공유 방식',
    items: [
      { type: 'body', text: "위의 '우다몬은 공개 플랫폼입니다' 섹션에서 언급된 공개 콘텐츠 공유 방식 외에도, 당사는 다음과 같은 방식으로 정보를 공유할 수 있습니다." },
      { type: 'heading', text: '동의에 따른 정보 공유' },
      { type: 'body', text: '당사는 귀하의 동의나 지시에 따라 개인정보를 공유할 수 있습니다.' },
      { type: 'heading', text: '서비스 제공업체와의 정보 공유' },
      { type: 'body', text: '당사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있으며, 모든 위탁업체와 개인정보 보호 관련 계약을 체결하고 있습니다.' },
      { type: 'table', headers: ['위탁업체', '위탁 업무', '처리 개인정보', '보유 기간'], rows: [
        ['Paddle.com (미국/영국)', '결제 처리 및 환불 (MOR)', '결제 관련 정보 (회사는 카드 정보 미보유)', '거래 완료 후 법령에 따라 보관'],
        ['Supabase Inc. (싱가포르 리전)', '클라우드 DB 호스팅 및 인증', '계정 정보, 서비스 이용 기록, 콘텐츠 데이터', '이용 기간 + 탈퇴 후 30일'],
        ['Google LLC (미국)', '앱 분석, 광고, 푸시 알림', '기기 식별자, 앱 이용 통계, 광고 ID, 푸시 토큰', 'Google 방침에 따름'],
        ['Vercel Inc. (미국)', '웹 호스팅 및 CDN', 'IP 주소, 접속 로그', 'Vercel 방침에 따름'],
      ] },
      { type: 'heading', text: '법률 준수를 위한 정보 공유' },
      { type: 'body', text: '당사는 국가 안보 또는 법 집행 요구사항을 충족시키는 것을 포함하되 이에 국한되지 않는 관련 법률이나 규정, 법적 절차 또는 정부의 요청에 따라 정보의 공개가 필요하다고 판단되는 경우 이를 공유할 수 있습니다. 법이 허용하는 범위 내에서, 이러한 요청에 따라 정보를 공개하기 전에 가능하면 사용자에게 미리 안내할 수 있도록 노력할 것입니다.' },
      { type: 'heading', text: '비상 상황 발생 시' },
      { type: 'body', text: '당사는 긴급하고 심각한 신체적 상해를 방지하기 위해 필요하다고 판단되는 경우 개인정보를 공유할 수 있습니다.' },
      { type: 'heading', text: '권리 행사 및 안전, 보안 강화' },
      { type: 'body', text: '당사는 사용자의 행동이 이용 약관이나 커뮤니티 가이드라인에 위배된다고 판단하는 경우나, 서비스와 당사 및 타인의 권리와 재산, 안전을 보호하려는 목적에 따라 정보를 제공할 수 있습니다.' },
      { type: 'heading', text: '집계된 정보 또는 익명화된 정보' },
      { type: 'body', text: '당사는 개인을 식별하는 데 사용될 수 없도록 집계되거나 익명화된 형태로 사용자 정보를 공유할 수 있습니다. 예를 들어, 사진이 몇 번이나 좋아요를 받았는지 총횟수를 표시하되 누가 좋아요를 눌렀는지는 다른 사용자에게 공개하지 않을 수 있으며, 광고주에게 광고를 본 사용자의 수를 알려줄 수 있습니다.' },
      { type: 'note', text: '중요: 당사는 사용자의 개인정보를 데이터 브로커 기업을 포함한 외부 업체에 판매하지 않습니다.' },
    ],
  },
  {
    title: '5. 우다몬의 개인정보 보호 방식',
    items: [
      { type: 'body', text: '당사는 사용자의 개인정보가 분실, 도난, 오용 및 무단 접근, 공개, 변경, 파기되지 않도록 보호하기 위해 다음과 같은 조치를 취하고 있습니다.' },
      { type: 'heading', text: '기술적 조치' },
      { type: 'bullets', items: [
        'TLS 1.3을 통한 데이터 전송 구간 암호화 (HTTPS)',
        'AES-256을 통한 데이터 저장 시 암호화',
        '비밀번호의 단방향 해시 암호화 (bcrypt/argon2)',
        '주민등록번호 등 민감정보의 별도 암호화 저장',
        'Supabase Row Level Security(RLS) 정책을 통한 데이터 접근 제어',
        'SQL Injection, XSS 등 주요 웹 보안 취약점 대응',
      ] },
      { type: 'heading', text: '관리적 조치' },
      { type: 'bullets', items: [
        '개인정보에 대한 접근 권한 최소화 원칙 적용',
        '정기적인 보안 감사 및 취약점 점검 실시',
        '개인정보 처리 관련 내부 관리 계획 수립 및 시행',
      ] },
      { type: 'heading', text: '물리적 조치' },
      { type: 'bullets', items: [
        '클라우드 서비스(Supabase) 제공업체의 데이터센터 물리적 보안 의존',
        '데이터센터 소재지: 싱가포르 (ap-southeast-1 리전)',
      ] },
    ],
  },
  {
    title: '6. 개인정보 보관 기간',
    items: [
      { type: 'body', text: '수집된 정보는 원래의 용도에 필요한 기간 동안 보관됩니다.' },
      { type: 'table', headers: ['보관 항목', '보관 기간', '근거'], rows: [
        ['계정 정보 (이메일, 닉네임)', '탈퇴 후 30일', '회사 내부 방침 (재가입 방지, 분쟁 해결)'],
        ['게시 콘텐츠 (사진, 댓글)', '삭제 요청 시 즉시', '회사 내부 방침'],
        ['서비스 이용 기록 (접속 로그, IP)', '최대 1년', '통신비밀보호법 제15조의2'],
        ['결제 및 거래 기록', '5년', '전자상거래법 제6조'],
        ['소비자 불만/분쟁 처리 기록', '3년', '전자상거래법 제6조'],
        ['표시·광고에 관한 기록', '6개월', '전자상거래법 제6조'],
        ['세금 관련 정보 (원천징수)', '5년', '국세기본법 제26조의2'],
      ] },
    ],
  },
  {
    title: '7. 귀하의 권리와 선택권',
    items: [
      { type: 'body', text: '귀하는 서비스 이용 시 개인정보를 안전하게 수집, 사용, 공유하고 이를 제한하는 방법을 선택할 수 있습니다. 대한민국 「개인정보 보호법」에 따라 귀하는 다음의 권리를 행사할 수 있습니다.' },
      { type: 'heading', text: '정보 액세스 및 변경' },
      { type: 'body', text: '귀하는 서비스 내 설정을 통해 프로필 정보를 직접 변경할 수 있습니다. 또한, 당사가 보관하는 개인정보의 사본을 요청할 수 있습니다.' },
      { type: 'heading', text: '계정 삭제' },
      { type: 'body', text: '귀하는 서비스 내 계정 설정 페이지에서 언제든지 계정을 삭제할 수 있습니다. 계정 삭제 요청 후 30일의 유예 기간이 적용되며, 유예 기간 내 취소가 가능합니다. 유예 기간 경과 후 모든 개인정보와 콘텐츠는 복구 불가능하게 삭제됩니다.' },
      { type: 'body', text: '단, 법령에 의해 보존이 필요한 정보(결제 기록, 세금 기록 등)는 해당 기간 경과 후 파기됩니다.' },
      { type: 'heading', text: '맞춤형 광고 제어' },
      { type: 'body', text: '귀하는 맞춤형 광고 수신을 거부할 수 있습니다.' },
      { type: 'bullets', items: [
        'iOS: 설정 > 개인정보 보호 > 추적 > 앱 추적 요청 허용 해제',
        'Android: 설정 > Google > 광고 > 광고 ID 삭제 또는 맞춤 광고 해제',
      ] },
      { type: 'heading', text: '쿠키 사용 방식 제어' },
      { type: 'body', text: '대부분의 웹 브라우저는 기본적으로 쿠키를 허용하도록 설정되어 있습니다. 귀하는 원한다면 브라우저에서 쿠키를 제거하거나 거부하도록 설정할 수 있습니다. 참고로 쿠키를 제거하거나 거부하도록 설정할 경우 당사 서비스 이용이 제한되거나 서비스 기능에 영향을 미칠 수 있습니다.' },
      { type: 'heading', text: '마케팅 수신 관리' },
      { type: 'body', text: '당사로부터 받는 마케팅 메시지를 수신 거부하려면 다음 방법을 이용하세요.' },
      { type: 'bullets', items: [
        '앱 내 설정 > 알림 설정에서 푸시 알림 수신 해제',
        '수신한 이메일 하단의 "수신 거부" 링크 클릭',
        'cs@udamonfan.com으로 수신 거부 요청',
      ] },
      { type: 'body', text: '마케팅 수신 거부 시에도 서비스 운영에 필수적인 공지사항(약관 변경, 보안 알림 등)은 발송됩니다.' },
      { type: 'heading', text: '개인정보 처리 정지/삭제/정정 요청' },
      { type: 'bullets', items: [
        '개인정보 열람 요청',
        '개인정보 정정/삭제 요청',
        '개인정보 처리 중지 요청',
      ] },
      { type: 'body', text: '위 요청은 앱 내 설정 또는 cs@udamonfan.com으로 제출할 수 있으며, 요청 접수 후 10일 이내에 처리 결과를 통지합니다. 대리인을 통한 요청 시 위임장이 필요합니다.' },
    ],
  },
  {
    title: '8. 해외로의 데이터 전송',
    items: [
      { type: 'body', text: '당사는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전하고 있습니다.' },
      { type: 'table', headers: ['이전받는 자', '이전 국가', '이전 항목', '이전 목적', '보유 기간'], rows: [
        ['Supabase', '싱가포르', '계정 정보, 서비스 데이터', '클라우드 DB 호스팅', '이용기간 + 탈퇴 후 30일'],
        ['Google LLC', '미국', '기기 식별자, 이용 통계, 광고 ID', '앱 분석, 광고, 푸시 알림', 'Google 방침'],
        ['Paddle.com', '미국/영국', '결제 관련 정보', '결제 처리', '법령 기간'],
        ['Vercel Inc.', '미국', 'IP, 접속 로그', '웹 호스팅', 'Vercel 방침'],
      ] },
      { type: 'body', text: '상기 업체들은 각각의 개인정보처리방침에 따라 적절한 보호 조치를 시행하고 있으며, 당사는 「개인정보 보호법」에 따라 이전에 필요한 보호 조치를 취하고 있습니다.' },
    ],
  },
  {
    title: '9. 14세 미만 아동의 개인정보 보호',
    items: [
      { type: 'body', text: '만 14세 미만의 아동은 계정을 생성하거나 서비스를 이용할 수 없습니다. 회원가입 시 만 14세 이상임을 확인하는 절차를 거치며, 만 14세 미만 아동의 이용이 확인되는 경우 해당 계정의 개인정보를 즉시 삭제하고 계정을 정지합니다.' },
      { type: 'body', text: '법정대리인이 아동의 개인정보에 대해 열람, 정정, 삭제를 요청하는 경우, 본인 확인 후 즉시 처리합니다.' },
    ],
  },
  {
    title: '10. 개인정보보호 책임자',
    items: [
      { type: 'body', text: '회사는 개인정보 처리에 관한 업무를 총괄하고, 사용자의 불만 처리 및 피해 구제를 위해 다음과 같이 개인정보보호 책임자를 지정하고 있습니다.' },
      { type: 'table', headers: ['구분', '내용'], rows: [
        ['성명', '김도하'],
        ['직책', '대표이사 / 개인정보보호 책임자'],
        ['이메일', 'cs@udamonfan.com'],
        ['결제 관련 문의', 'pay@udamonfan.com'],
        ['사업자', '주식회사 헤이디컴퍼니 (사업자등록번호: 492-88-03484)'],
      ] },
    ],
  },
  {
    title: '11. 권익 침해 구제 방법',
    items: [
      { type: 'body', text: '사용자는 개인정보 침해로 인한 피해 구제를 위해 다음 기관에 상담 또는 신고를 할 수 있습니다.' },
      { type: 'table', headers: ['기관명', '전화번호', '웹사이트'], rows: [
        ['개인정보분쟁조정위원회', '1833-6972', 'www.kopico.go.kr'],
        ['개인정보침해신고센터 (KISA)', '118', 'privacy.kisa.or.kr'],
        ['대검찰청 사이버수사과', '1301', 'www.spo.go.kr'],
        ['경찰청 사이버수사국', '182', 'ecrm.police.go.kr'],
      ] },
    ],
  },
  {
    title: '12. 본 방침 변경에 관한 조항',
    items: [
      { type: 'body', text: '당사는 본 개인정보처리방침을 수시로 변경할 수 있습니다. 변경 사항이 있을 경우 상단의 시행일을 수정하여 변경 사실을 알려드립니다.' },
      { type: 'body', text: '변경 사항이 중대한 것으로 판단되는 경우, 계정에 연결된 주소로 이메일을 보내거나 서비스 내 공지를 통해 최소 7일 전에 변경 사항을 알려드립니다. 사용자의 권리에 중대한 영향을 미치는 변경은 30일 전에 공지합니다.' },
      { type: 'body', text: '당사의 데이터 처리 방식과 개인정보 보호 방법에 대한 최신 정보를 확인하려면 개인정보처리방침을 정기적으로 검토하시기 바랍니다. 개인정보처리방침 변경 후에도 서비스를 계속 이용할 경우, 변경된 방침에 동의하는 것으로 간주됩니다.' },
    ],
  },
  {
    title: '13. 문의 방법',
    items: [
      { type: 'body', text: '본 개인정보처리방침에 관해 추가로 궁금한 점이 있다면 다음 연락처로 문의해주시기 바랍니다.' },
      { type: 'bullets', items: [
        '일반 문의: cs@udamonfan.com',
        '결제 관련 문의: pay@udamonfan.com',
        '개인정보보호 책임자: cs@udamonfan.com',
      ] },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────
export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const renderItem = (item: SectionItem, idx: number) => {
    switch (item.type) {
      case 'heading':
        return <Text key={idx} style={styles.subHeading}>{item.text}</Text>;
      case 'body':
        return <Text key={idx} style={styles.bodyText}>{item.text}</Text>;
      case 'bullets':
        return (
          <View key={idx} style={styles.listWrap}>
            {item.items.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        );
      case 'numbered':
        return (
          <View key={idx} style={styles.listWrap}>
            {item.items.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.numLabel}>{i + 1}.</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        );
      case 'table':
        return (
          <View key={idx} style={styles.tableWrap}>
            <View style={styles.tableHeaderRow}>
              {item.headers.map((h, i) => (
                <Text key={i} style={[styles.tableHeaderCell, i === 0 && styles.tableFirstCol]}>
                  {h}
                </Text>
              ))}
            </View>
            {item.rows.map((row, ri) => (
              <View key={ri} style={styles.tableRow}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={[styles.tableCell, ci === 0 && styles.tableFirstCol]}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      case 'note':
        return (
          <View key={idx} style={styles.noteWrap}>
            <Text style={styles.noteText}>{item.text}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>시행일: 2026년 3월 28일</Text>
          <View style={styles.metaDivider} />
          <Text style={styles.metaText}>버전 3.0</Text>
        </View>

        {/* Intro */}
        <Text style={styles.introText}>{INTRO}</Text>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(renderItem)}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footerBlock}>
          <Text style={styles.footerLine}>본 개인정보처리방침에 대해 궁금한 점이 있다면 저희에게 문의해주세요.</Text>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>주식회사 헤이디컴퍼니</Text>
            <Text style={styles.companyDetail}>사업자등록번호: 492-88-03484</Text>
            <Text style={styles.companyDetail}>대한민국</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  metaText: {
    fontSize: fontSize.micro2,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border,
  },

  // Intro
  introText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heading,
    color: colors.primary,
    marginBottom: 12,
  },

  // Sub heading
  subHeading: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },

  // Body
  bodyText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },

  // Bullet / Numbered lists
  listWrap: {
    gap: 6,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 4,
    gap: 8,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    marginTop: 8,
  },
  numLabel: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textTertiary,
    minWidth: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    lineHeight: 21,
  },

  // Table
  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginVertical: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heading,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    flex: 1,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textSecondary,
    paddingVertical: 10,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  tableFirstCol: {
    flex: 0.7,
  },

  // Note
  noteWrap: {
    backgroundColor: colors.primaryAlpha8,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.primary,
    lineHeight: 20,
  },

  // Footer
  footerBlock: {
    marginTop: 12,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  footerLine: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  companyInfo: {
    alignItems: 'center',
    marginTop: 16,
    gap: 3,
  },
  companyName: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },
  companyDetail: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.textTertiary,
  },
});
