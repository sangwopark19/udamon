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
const INTRO = `DUGOUT 사용자 여러분 안녕하세요. 본 DUGOUT 이용약관("본 약관")은 주식회사 헤이디컴퍼니("회사", "당사", "저희")가 제공하는 DUGOUT 애플리케이션, 웹사이트 및 기타 온라인 제품과 서비스(총칭하여 "서비스")에 대한 사용자의 액세스 권한 및 이용에 적용됩니다.

DUGOUT은 KBO 야구를 사랑하는 팬들을 위한 포토 공유 및 커뮤니티 플랫폼이며, 즐겁고 안전한 환경을 위해 몇 가지 기본적인 규칙을 준수해야 합니다. 서비스를 이용하려면 반드시 본 약관에 동의해야 합니다. 본 약관에 동의하지 않으면 당사 서비스에 액세스하거나 서비스를 이용할 수 없습니다.`;

const SECTIONS: Section[] = [
  {
    title: '1. 서비스 액세스 권한',
    items: [
      { type: 'body', text: '만 14세 미만은 DUGOUT 서비스를 이용하거나 액세스할 수 없습니다. 서비스에 액세스하는 경우 모든 공지사항 및 추가 약관을 주의 깊게 읽어주시기 바랍니다.' },
      { type: 'body', text: '서비스를 이용하면 다음 사항에 해당하는 것으로 간주됩니다.' },
      { type: 'bullets', items: [
        '만 14세 이상이며, 거주 국가의 법률에 따라 서비스 액세스 및 이용이 허용되는 최소 연령 요건을 충족합니다.',
        '회사와 법적 구속력이 있는 계약을 체결할 수 있는 자격이 있습니다. 만 14세 이상이지만 거주 지역에서 법정 성년연령 미만인 경우에는 법정 보호자가 본 약관을 검토하고 동의해야 합니다.',
        '적용 가능한 모든 법률에 따라 당사 서비스 이용이 금지된 대상이 아닙니다.',
        '서비스 이용이 영구적으로 정지되거나 차단된 적이 없습니다.',
      ] },
    ],
  },
  {
    title: '2. 개인정보 보호',
    items: [
      { type: 'body', text: 'DUGOUT의 개인정보처리방침은 귀하가 당사 서비스에 액세스하거나 서비스를 이용할 때 당사가 귀하의 정보를 수집, 이용, 공유하는 방식과 이유를 설명합니다. 귀하가 서비스를 이용하면 개인정보처리방침에 명시된 대로 해당 정보의 수집 및 이용에 동의한 것으로 간주됩니다.' },
    ],
  },
  {
    title: '3. 서비스의 이용',
    items: [
      { type: 'heading', text: '3.1 라이선스 부여' },
      { type: 'body', text: '본 약관을 계속해서 완전히 준수한다는 조건하에 회사는 귀하에게 다음을 부여합니다.' },
      { type: 'bullets', items: [
        '합법적인 앱 마켓(App Store, Google Play)을 통해 얻은 DUGOUT 애플리케이션을 귀하가 소유하거나 관리하는 모바일 기기에 설치하고 사용할 권리',
        'DUGOUT 서비스에 대한 개인적이며, 양도 불가능하고, 비독점적이며, 철회 가능하고, 제한적인 라이선스',
      ] },
      { type: 'body', text: '본 약관에서 명시적으로 부여되지 않은 모든 권리는 당사가 보유합니다.' },
      { type: 'heading', text: '3.2 금지되는 이용 방법' },
      { type: 'body', text: '관련 법률에 따라 이러한 제한이 허용되지 않는 경우를 제외하고, 귀하는 당사의 서면 동의 없이 다음 행위를 할 수 없습니다.' },
      { type: 'bullets', items: [
        '당사 서비스 또는 콘텐츠에 대한 라이선스 제공, 판매, 이전, 양도, 배포, 호스팅 또는 기타 상업적 목적으로 이용하는 행위',
        '당사 서비스 또는 콘텐츠의 일부를 수정하거나, 2차 저작물을 제작하거나, 분해·역컴파일·역설계하는 행위',
        '당사와 유사하거나 경쟁 관계에 있는 웹사이트, 제품 또는 서비스를 개발하기 위해 당사 서비스나 콘텐츠에 액세스하는 행위',
      ] },
      { type: 'heading', text: '3.3 서비스 변경' },
      { type: 'body', text: '저희는 항상 서비스를 개선해 나가고 있습니다. 이는 곧 기능, 제품 또는 작동 방식이 추가되거나 제거될 수 있음을 의미하며, 이 경우 최대한 사전에 안내 드리도록 노력하겠지만 그렇게 하지 못할 수도 있습니다. 당사는 사전 안내 여부에 관계없이 언제든지 서비스의 전체 또는 일부를 수정, 일시 정지 또는 중단할 권리를 보유합니다.' },
      { type: 'body', text: '귀하는 당사가 서비스 또는 그 일부를 변경, 일시 정지 또는 중단하더라도 이에 대해 당사가 귀하 또는 제3자에게 어떠한 책임도 지지 않는다는 데 동의합니다. 단, 서비스 전체를 종료하는 경우 최소 30일 전에 사전 공지하며, 미사용 티켓 및 미정산 후원금의 처리 방법을 안내합니다.' },
      { type: 'heading', text: '3.4 맞춤 설정' },
      { type: 'body', text: '저희는 서비스 내에서 귀하의 활동, 응원 팀, 팔로우한 포토그래퍼, 직접 적용한 기본 설정 등 다양한 요소를 바탕으로 서비스 이용 환경을 귀하에게 맞춤 설정합니다.' },
    ],
  },
  {
    title: '4. DUGOUT 계정 및 계정 보안',
    items: [
      { type: 'heading', text: '4.1 계정 생성' },
      { type: 'body', text: '당사 서비스의 특정 기능을 이용하려면 DUGOUT 계정("계정")을 만들어야 합니다. 계정은 이메일 또는 소셜 로그인(Apple, Google, 카카오)을 통해 생성할 수 있습니다.' },
      { type: 'heading', text: '4.2 계정 보안' },
      { type: 'bullets', items: [
        '귀하의 계정과 관련된 모든 정보 및 사건에 대한 책임은 전적으로 귀하에게 있습니다.',
        '계정의 보안을 유지하고, 귀하의 허락 없이 누군가가 계정에 액세스한 사실을 발견하거나 의심되는 경우 즉시 DUGOUT에 고지해야 합니다.',
        '귀하의 계정에만 사용되는 강력한 비밀번호를 사용하는 것을 권장합니다.',
        '귀하는 당사의 사전 서면 승인 없이 귀하의 계정에 대한 라이선스를 제공하거나, 계정을 판매 또는 양도해서는 안 됩니다.',
      ] },
      { type: 'heading', text: '4.3 계정 유형' },
      { type: 'body', text: '서비스에는 두 가지 계정 유형이 있습니다.' },
      { type: 'table', headers: ['계정 유형', '설명', '주요 기능'], rows: [
        ['팬 회원', '일반 사용자 계정으로, 모든 가입자에게 기본 부여', '사진 열람, 좋아요, 팔로우, 후원, 댓글, 일반 사진 업로드, 커뮤니티 참여'],
        ['포토그래퍼', '크리에이터 계정으로, 팬 회원이 신청하여 전환 (자동 승인)', '팬 회원 기능 + 전문 포토 업로드, 후원 수령, 포트폴리오 운영, 팬 통계 확인'],
      ] },
      { type: 'note', text: '포토그래퍼 계정으로 전환 시 추가 약관(포토그래퍼 이용약관)에 동의가 필요합니다.' },
    ],
  },
  {
    title: '5. 귀하의 콘텐츠',
    items: [
      { type: 'heading', text: '5.1 콘텐츠의 정의' },
      { type: 'body', text: '서비스에는 사진, 텍스트, 댓글, 프로필 정보 및 기타 자료("콘텐츠")가 포함될 수 있습니다. 여기에는 귀하 본인 또는 귀하의 계정을 통해 만들거나 제출한 콘텐츠("귀하의 콘텐츠")가 포함됩니다.' },
      { type: 'heading', text: '5.2 콘텐츠 소유권 및 라이선스' },
      { type: 'body', text: '소유권: "귀하의 콘텐츠"에 대한 모든 저작권과 소유권은 귀하 본인에게 있습니다. 특히 포토그래퍼가 업로드한 사진의 저작권은 해당 포토그래퍼에게 있습니다.' },
      { type: 'body', text: '플랫폼 라이선스: 서비스로 귀하의 콘텐츠를 만들거나 서비스에 제출하면 귀하는 당사에 서비스 표시 및 배포를 위한 비독점적, 로열티 없는, 철회 가능한 사용 라이선스를 부여합니다. 이 라이선스는 서비스 운영 목적으로만 사용되며, 콘텐츠 삭제 시 철회됩니다.' },
      { type: 'note', text: '중요: 당사는 귀하의 콘텐츠를 별도의 동의 없이 상업적 목적(광고, 판매 등)으로 이용하지 않습니다. 이는 포토그래퍼의 창작물을 보호하기 위한 핵심 원칙입니다.' },
      { type: 'heading', text: '5.3 사진 콘텐츠 특별 규정' },
      { type: 'body', text: 'DUGOUT은 사진 중심의 플랫폼으로, 이미지 콘텐츠에 대해 다음의 특별 규정이 적용됩니다.' },
      { type: 'bullets', items: [
        '다운로드 제한: 서비스에 업로드된 사진은 다운로드할 수 없습니다. 사진의 저작권을 보호하기 위해 스크린샷, 화면 녹화, 기타 기술적 수단을 통한 무단 복제도 금지합니다.',
        '워터마크: 포토그래퍼는 업로드 시 워터마크 적용 여부를 선택할 수 있습니다.',
        '선수 초상권: 사용자는 KBO 선수의 초상권 및 퍼블리시티권을 존중해야 합니다. 선수 본인 또는 소속 구단으로부터 콘텐츠 삭제 요청이 있는 경우, 당사는 해당 콘텐츠를 삭제할 수 있습니다.',
        'KBO 관련 면책: DUGOUT은 KBO와 공식 라이선스 관계가 없는 독립적인 팬 커뮤니티 플랫폼입니다. 서비스 내 콘텐츠는 KBO, 구단, 선수가 공식적으로 승인하거나 보증한 것이 아닙니다.',
      ] },
      { type: 'heading', text: '5.4 콘텐츠 관리' },
      { type: 'body', text: '당사에 귀하의 콘텐츠를 사전 검토, 수정 또는 모니터링할 의무는 없지만, 단독 재량에 따라 언제든지 어떤 이유에서든 귀하의 콘텐츠를 삭제하거나 제거할 수 있습니다.' },
      { type: 'body', text: '콘텐츠 삭제 또는 계정 제한에 대해 이의가 있는 경우, support@udamonfan.com 으로 접수할 수 있으며, 회사는 접수일로부터 7영업일 이내에 결과를 통지합니다.' },
    ],
  },
  {
    title: '6. 제3자 콘텐츠 및 광고',
    items: [
      { type: 'body', text: '서비스에는 광고주, 파트너, 다른 사용자가 게시했을 수 있는 제3자 웹사이트, 제품 또는 서비스로 연결되는 링크("제3자 콘텐츠")가 포함될 수 있습니다. 제3자 콘텐츠는 당사의 관리 범위에 있지 않으며, 당사는 제3자 웹사이트, 제품 또는 서비스에 대해 어떠한 책임도 지지 않습니다.' },
      { type: 'body', text: '서비스에는 Google AdMob을 통한 광고가 포함될 수 있습니다. 광고의 유형, 범위, 대상은 변경될 수 있으며, 귀하는 서비스 내에서 콘텐츠 또는 정보가 게시될 때 광고가 함께 표시될 수 있음을 인정하고 이에 동의합니다.' },
    ],
  },
  {
    title: '7. 티켓 및 서포트 시스템',
    items: [
      { type: 'heading', text: '7.1 티켓 구매 및 후원' },
      { type: 'bullets', items: [
        '팬 회원은 티켓을 구매하여 포토그래퍼를 후원할 수 있습니다. 후원은 팬이 포토그래퍼에게 직접 하는 구조이며, 회사는 플랫폼 수수료를 공제합니다.',
        '티켓 결제는 Paddle.com이 판매자 대행(Merchant of Record)으로 처리하며, 회사는 결제 수단 정보(신용카드 번호, 계좌 정보 등)를 직접 수집하거나 저장하지 않습니다.',
      ] },
      { type: 'heading', text: '7.2 티켓 사용 및 환불' },
      { type: 'bullets', items: [
        '티켓은 서비스 내에서 포토그래퍼 서포트에만 사용됩니다.',
        '구매한 티켓은 환불이 불가합니다. 단, 결제 오류 등 회사 귀책 사유는 예외로 합니다.',
        '티켓의 현금 전환은 서비스 정책에 따릅니다.',
        '부정한 방법으로 획득한 티켓은 회수될 수 있으며, 관련 계정이 정지될 수 있습니다.',
      ] },
      { type: 'heading', text: '7.3 후원금 배분 구조' },
      { type: 'table', headers: ['항목', '비율', '설명'], rows: [
        ['Paddle 결제 수수료', '5% + $0.50/건', '후원금에서 선공제 (Paddle이 MOR로서 직접 처리)'],
        ['플랫폼 수수료', '공제 후 금액의 30%', '서비스 운영 비용으로 회사에 귀속'],
        ['포토그래퍼 수령액', '공제 후 금액의 70%', '원천징수세(3.3%) 공제 후 포토그래퍼에게 지급'],
      ] },
      { type: 'heading', text: '7.4 정산' },
      { type: 'bullets', items: [
        '포토그래퍼에 대한 정산은 매월 20일에 전월 발생분을 일괄 정산합니다.',
        '헤이디컴퍼니가 3.3% 원천징수세를 공제한 후 지급합니다.',
        '정산금액이 최소 정산 기준액 미만인 경우, 다음 정산일로 이월됩니다.',
        '포토그래퍼는 정산 받을 계좌 정보를 정확히 등록해야 하며, 오류로 인한 지급 지연에 회사는 책임을 지지 않습니다.',
      ] },
    ],
  },
  {
    title: '8. 허용되지 않는 행위',
    items: [
      { type: 'body', text: '귀하는 서비스를 사용하거나 액세스할 때 반드시 본 약관 및 관련 법률, 규정, 규제를 준수해야 합니다. 다음과 같은 행위는 허용되지 않습니다.' },
      { type: 'numbered', items: [
        '서비스를 방해하거나, 중단시키거나, 장애를 유발하거나, 과부하를 일으키거나, 서비스를 손상시킬 수 있는 그 밖의 모든 행위',
        '다른 사용자의 계정 또는 서비스의 비공개 영역에 액세스하거나 액세스를 시도하는 행위',
        '바이러스, 웜, 악성 코드 또는 그 밖의 소프트웨어를 서비스에 업로드, 전송 또는 배포하는 행위',
        '적용되는 법률을 위반하거나 개인 또는 단체의 지식재산권 또는 그 밖의 소유권을 침해하기 위해 서비스를 사용하는 행위',
        '자동화된 수단(봇, 크롤링, 스크래핑 등)으로 서비스의 데이터에 액세스하거나 수집하는 행위',
        '결제 시스템을 악용하거나 부정한 방법으로 티켓을 획득하는 행위',
        '불법적이거나 유해한 콘텐츠 게시 (음란물, 폭력물, 허위 정보, 혐오 표현 포함)',
        '다른 사용자에 대한 괴롭힘, 위협, 차별, 협박, 비방, 스토킹',
        '타인의 개인정보를 무단으로 수집하거나 공유하는 행위',
        '상업적 광고 또는 홍보 목적의 무단 게시 (스팸)',
        '선수 초상권/퍼블리시티권을 침해하거나 무단으로 상업적 이용하는 행위',
        '기타 관련 법령에 위반되는 일체의 행위',
      ] },
      { type: 'body', text: '본 약관을 위반한다고 판단되는 콘텐츠 또는 행위를 발견할 경우 신고해 주시기를 권장합니다. 보안 취약점에 대해 신고하려면 security@udamonfan.com에 이메일을 보내주세요.' },
    ],
  },
  {
    title: '9. 커뮤니티 가이드라인',
    items: [
      { type: 'body', text: 'DUGOUT은 모든 야구 팬을 위한 건전하고 존중적인 커뮤니티를 지향합니다. 다음 가이드라인은 본 약관의 일부로서 효력이 있습니다.' },
      { type: 'bullets', items: [
        '존중: 다른 사용자, 포토그래퍼, 선수, 구단을 존중하세요. 비방, 인신공격, 혐오 표현은 금지됩니다.',
        '진정성: 허위 정보를 유포하거나 타인을 사칭하지 마세요. 포토그래퍼는 본인이 직접 촬영한 사진만 업로드해야 합니다.',
        '저작권: 타인의 사진이나 콘텐츠를 무단으로 사용하지 마세요.',
        '안전: 개인정보를 공개하거나 타인의 안전을 위협하는 행위는 금지됩니다.',
        '공정성: 조작된 활동(좋아요 조작, 가짜 계정, 팔로워 구매 등)은 금지됩니다.',
        '적절성: 야구 팬 커뮤니티에 적합하지 않은 콘텐츠(음란물, 폭력물, 정치적 선동 등)는 게시할 수 없습니다.',
      ] },
      { type: 'heading', text: '9.1 제재 단계' },
      { type: 'numbered', items: [
        '1차 경고: 콘텐츠 삭제 및 경고 알림',
        '2차 제한: 일정 기간 기능 제한 (업로드/댓글 금지)',
        '3차 정지: 계정 일시 정지 (7일~30일)',
        '4차 해지: 계정 영구 해지 (재가입 불가)',
      ] },
      { type: 'note', text: '중대한 위반(불법 콘텐츠, 해킹, 결제 사기 등)의 경우 경고 없이 즉시 계정이 해지될 수 있습니다.' },
    ],
  },
  {
    title: '10. 저작권 및 삭제 조치',
    items: [
      { type: 'body', text: 'DUGOUT은 타인의 지식재산권을 존중하며 당사 서비스 사용자 또한 이를 존중하도록 규정하고 있습니다. 저희는 저작권을 침해하는 자료를 서비스에서 삭제하고, 반복적으로 저작권을 침해하는 사용자에 대해서는 적절한 경우에 계정을 해지하는 조치가 포함된 정책을 시행 중입니다.' },
      { type: 'body', text: '당사 서비스에서 귀하가 소유하거나 관리하는 저작권을 침해한다고 판단되는 사례가 있다면 다음의 정보와 함께 삭제를 요청해 주세요.' },
      { type: 'bullets', items: [
        '저작권 보유 증빙',
        '침해 콘텐츠 식별 정보 (URL 또는 스크린샷)',
        '요청자 신원 정보',
        '연락처: copyright@udamonfan.com',
      ] },
      { type: 'body', text: '저작권 신고의 결과로 당사가 귀하의 콘텐츠를 삭제하는 경우, 이에 대해 통지해 드립니다. 귀하의 콘텐츠가 실수나 저작권 신고건 오인으로 잘못 삭제되었다고 생각된다면 동일한 연락처로 이의를 제기할 수 있습니다.' },
    ],
  },
  {
    title: '11. 지식재산권',
    items: [
      { type: 'body', text: '서비스는 주식회사 헤이디컴퍼니가 소유하고 운영합니다. 회사가 제공하는 서비스의 시각적 인터페이스, 그래픽, 디자인, 컴파일물, 정보, 데이터, 컴퓨터 코드, 제품, 서비스, 상표 및 기타 모든 요소("자료")는 지식재산권 및 기타 법률에 의해 보호됩니다.' },
      { type: 'body', text: '귀하는 자료를 다운로드하거나 서비스를 이용하더라도 어떠한 소유권도 취득하지 않음을 인정하고 이에 동의합니다. 본 약관에서 자료에 대해 명시적으로 부여되지 않은 모든 권리는 회사가 보유합니다.' },
    ],
  },
  {
    title: '12. 배상 책임',
    items: [
      { type: 'body', text: '법률상 금지되지 않는 범위 내에서, 귀하는 (a) 귀하의 서비스 이용, (b) 본 약관의 위반, (c) 관련 법률 또는 규정의 위반, (d) 귀하의 콘텐츠가 원인이거나 이와 관련하여 제3자가 제기한 모든 청구나 요구, 그에 따른 책임, 손해, 손실 및 지출(변호사 비용 및 기타 비용 포함)으로부터 회사, 그 계열사, 각 이사, 임원, 직원, 제휴사, 대리인, 계약자, 제3자 서비스 제공업체("회사 관련 당사자")를 옹호하고, 면책하며, 손해가 없도록 하는 데 동의합니다.' },
    ],
  },
  {
    title: '13. 면책 조항 및 책임 제한',
    items: [
      { type: 'body', text: '본 약관의 어떤 내용도 귀하에게 법적으로 보장된 서비스 사용자로서의 권리를 침해하지 않습니다. 일부 관할 지역에서는 본 조항에 명시된 특정 보증의 배제나 책임 제한을 허용하지 않으므로, 아래 조항이 귀하에게 완전히 적용되지 않을 수 있습니다.' },
      { type: 'body', text: '당사의 서비스는 "현 상태 그대로(AS IS)" 및 "이용 가능한 상태로(AS AVAILABLE)" 제공되며, 상품성, 특정 목적에 대한 적합성, 비침해에 대한 암묵적 보증을 포함한 명시적, 암묵적, 법적 또는 법정상 어떠한 종류의 진술, 보증 또는 조건은 존재하지 않습니다.' },
      { type: 'body', text: '회사 관련 당사자는 서비스에 게시된 콘텐츠에서 기인하거나 관련된 손실을 포함해 본 약관 또는 서비스로부터 기인하거나 관련된 어떠한 간접적, 결과적, 부수적, 특별한 손해나 이익 손실에 대해서도 귀하에게 책임을 지지 않습니다.' },
      { type: 'note', text: '포토그래퍼의 후원금 수익에 대한 세금 신고 의무는 포토그래퍼 본인에게 있습니다 (회사는 3.3% 원천징수만 처리합니다).' },
    ],
  },
  {
    title: '14. 준거법 및 관할 법원',
    items: [
      { type: 'body', text: '저희는 귀하가 DUGOUT을 즐겁게 이용하길 바랍니다. 그러나 문제나 분쟁이 있을 경우 이의를 제기하고 당사와 비공식적으로 해결하기 위해 노력할 것이라는 데 동의해 주시기 바랍니다.' },
      { type: 'numbered', items: [
        '본 약관은 대한민국 법률에 따라 해석됩니다.',
        '본 약관과 관련한 분쟁은 서울중앙지방법원을 전속 관할법원으로 합니다.',
        '소액 사건의 경우, 대한상사중재원 또는 한국소비자원 온라인분쟁조정(ODR, www.ecmc.or.kr)을 통해 해결할 수 있습니다.',
      ] },
    ],
  },
  {
    title: '15. 본 약관 변경에 관한 조항',
    items: [
      { type: 'body', text: '당사는 약관을 수시로 변경할 수 있습니다. 변경 사항이 있을 경우 개정된 약관을 게시하고 위의 효력 발생일을 업데이트합니다.' },
      { type: 'body', text: '변경 사항이 중대한 것으로 판단되는 경우, 계정에 연결된 주소로 이메일을 전송하거나 효력 발생일로부터 최소 30일 전에 당사 서비스를 통해 공지를 하여 변경 사항을 알려드리겠습니다.' },
      { type: 'body', text: '귀하는 개정된 약관의 효력 발생일과 그 이후에 계속 서비스에 액세스하거나 사용함으로써 개정된 약관의 적용을 받는 데 동의하게 됩니다. 개정된 약관에 동의하지 않을 경우, 변경 사항에 대한 효력이 발생하기 전에 반드시 당사 서비스에 액세스하거나 서비스를 이용하는 것을 중단해야 합니다.' },
    ],
  },
  {
    title: '16. 약관 해지',
    items: [
      { type: 'heading', text: '16.1 사용자에 의한 해지' },
      { type: 'body', text: '귀하는 언제든지 어떤 이유로든 계정을 삭제하고 모든 서비스 이용을 중단함으로써 본 약관을 해지할 수 있습니다. 계정 삭제 요청 후 30일의 유예 기간이 적용되며, 유예 기간 내 취소가 가능합니다. 유예 기간 경과 후 모든 개인정보와 콘텐츠는 복구 불가능하게 삭제됩니다.' },
      { type: 'body', text: '계정을 삭제하지 않은 채 서비스 이용을 중단할 경우 장기간 휴면 상태로 인해 계정이 비활성화될 수 있습니다.' },
      { type: 'heading', text: '16.2 회사에 의한 해지' },
      { type: 'body', text: '관련 법률이 허용하는 최대한의 범위에서 당사는 언제든지 본 약관 또는 커뮤니티 가이드라인의 위반을 포함한 어떤 이유로든 귀하의 계정 또는 서비스에 대한 액세스 및 이용 권한을 일시 정지하거나 해지할 수 있습니다. 계정 해지 시 미정산 후원금은 정산 절차에 따라 처리됩니다. 단, 부정 행위로 인한 해지의 경우 후원금 지급이 보류될 수 있습니다.' },
      { type: 'heading', text: '16.3 존속 조항' },
      { type: 'body', text: '다음 조항들은 본 약관 또는 귀하의 계정이 해지되더라도 계속 효력을 유지합니다: 제5조(귀하의 콘텐츠), 제8조(허용되지 않는 행위), 제12조(배상 책임), 제13조(면책 조항 및 책임 제한), 제14조(준거법 및 관할 법원), 제16조(약관 해지), 제17조(기타).' },
    ],
  },
  {
    title: '17. 기타',
    items: [
      { type: 'body', text: '본 약관은 개인정보처리방침 및 본 약관에 참조되어 명시된 기타 모든 계약서와 함께 서비스에 대한 귀하의 액세스와 이용에 관한 귀하와 당사 간 전체 계약을 구성합니다.' },
      { type: 'body', text: '당사가 본 약관에 따른 어떠한 권리나 조항을 행사하거나 집행하지 않더라도, 해당 권리나 조항을 포기한 것으로 간주되지 않습니다. 본 조항의 일부가 무효 또는 집행 불가능한 것으로 판단되더라도, 해당 조항은 가능한 최대한의 범위에서 효력을 유지하며 나머지 조항들은 계속해서 완전한 효력을 유지합니다.' },
      { type: 'body', text: '귀하는 회사의 사전 서면 동의 없이 본 약관에 따른 권리나 의무를 양도하거나 이전할 수 없습니다. 회사는 본 약관에 따른 당사의 권리와 의무를 자유롭게 양도할 수 있습니다.' },
      { type: 'body', text: '본 약관에서 사용된 제목은 참조용일 뿐이며, 약관을 해석할 때 고려되지 않습니다.' },
    ],
  },
  {
    title: '18. 공지 및 연락',
    items: [
      { type: 'bullets', items: [
        '서비스 관련 공지사항은 서비스 내 공지사항 페이지 또는 푸시 알림을 통해 전달됩니다.',
        '고객 지원: support@udamonfan.com',
        '저작권 문의: copyright@udamonfan.com',
        '개인정보 문의: privacy@udamonfan.com',
        '보안 문제 신고: security@udamonfan.com',
      ] },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────
export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>이용약관</Text>
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
          <Text style={styles.footerLine}>본 약관은 귀하와 주식회사 헤이디컴퍼니 간의 법적 구속력을 갖는 계약입니다.</Text>
          <Text style={styles.footerLine}>본 약관에 대해 궁금한 점이 있다면 저희에게 문의해주세요.</Text>
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
