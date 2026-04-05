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
const SECTIONS: Section[] = [
  {
    title: '제1조 (목적)',
    items: [
      { type: 'body', text: '본 포토그래퍼 이용약관(이하 "본 약관")은 주식회사 헤이디컴퍼니(이하 "회사")가 운영하는 우다몬 서비스(이하 "서비스")에서 포토그래퍼 계정을 이용하는 사용자(이하 "포토그래퍼")의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.' },
      { type: 'body', text: '본 약관은 우다몬 이용약관(이하 "기본 약관")의 추가 약관으로서, 기본 약관과 함께 적용됩니다. 본 약관에서 정하지 않은 사항은 기본 약관에 따르며, 본 약관과 기본 약관이 충돌하는 경우 포토그래퍼 활동에 관해서는 본 약관이 우선 적용됩니다.' },
    ],
  },
  {
    title: '제2조 (정의)',
    items: [
      { type: 'body', text: '본 약관에서 사용하는 용어의 정의는 다음과 같습니다. 본 약관에서 정의되지 않은 용어는 기본 약관의 정의에 따릅니다.' },
      { type: 'numbered', items: [
        '"포토그래퍼": 팬 회원이 포토그래퍼 계정으로 전환하여 전문 포토 업로드 및 후원 수령 기능이 활성화된 사용자를 말합니다.',
        '"전문 포토": 포토그래퍼가 직접 촬영하여 서비스에 업로드하는 KBO 야구 관련 사진을 말합니다.',
        '"후원금": 팬 회원이 티켓을 사용하여 포토그래퍼에게 지급하는 금액을 말합니다.',
        '"플랫폼 수수료": 후원금에서 회사가 서비스 운영 비용으로 공제하는 금액(Paddle 결제 수수료 공제 후 금액의 30%)을 말합니다.',
        '"정산금": 후원금에서 Paddle 결제 수수료와 플랫폼 수수료를 공제하고, 원천징수세(3.3%)를 차감한 후 포토그래퍼에게 실제 지급되는 금액을 말합니다.',
        '"포트폴리오": 포토그래퍼의 프로필 페이지에 표시되는 업로드 사진 모음을 말합니다.',
      ] },
    ],
  },
  {
    title: '제3조 (포토그래퍼 계정 전환)',
    items: [
      { type: 'heading', text: '3.1 전환 자격' },
      { type: 'bullets', items: [
        '서비스에 가입한 만 14세 이상의 팬 회원은 누구나 포토그래퍼 계정으로 전환을 신청할 수 있습니다.',
        '포토그래퍼 전환은 자동 승인되며, 전환 시 본 약관에 대한 동의가 필요합니다.',
        '포토그래퍼 전환 시 후원금 정산을 위해 추가 정보(정산 계좌, 주민등록번호 등)를 제공해야 합니다.',
      ] },
      { type: 'heading', text: '3.2 전환 취소' },
      { type: 'bullets', items: [
        '포토그래퍼는 언제든지 설정에서 팬 회원 계정으로 되돌릴 수 있습니다.',
        '전환 취소 시 미정산 후원금은 최종 정산 후 지급됩니다.',
        '전환 취소 후에도 기존에 업로드한 전문 포토는 삭제되지 않으며, 포토그래퍼가 직접 삭제해야 합니다.',
        '전환 취소 후 재전환 시 추가 정보를 다시 제공해야 할 수 있습니다.',
      ] },
      { type: 'heading', text: '3.3 계정 해지' },
      { type: 'body', text: '포토그래퍼가 서비스 계정을 완전히 삭제하는 경우, 기본 약관 제16조(약관 해지)의 절차가 적용됩니다. 미정산 후원금은 계정 삭제 유예 기간(30일) 내에 최종 정산 처리됩니다.' },
    ],
  },
  {
    title: '제4조 (포토그래퍼의 권리)',
    items: [
      { type: 'bullets', items: [
        '전문 포토 업로드: KBO 야구 관련 전문 사진을 서비스에 업로드할 수 있습니다.',
        '후원 수령: 팬 회원으로부터 티켓을 통한 후원을 수령할 수 있습니다.',
        '포트폴리오 운영: 프로필 페이지에 포트폴리오를 구성하고 관리할 수 있습니다.',
        '팬 통계 확인: 업로드한 사진의 조회수, 좋아요, 팔로워 등 통계를 확인할 수 있습니다.',
        '워터마크 설정: 업로드하는 사진에 워터마크 적용 여부를 선택할 수 있습니다.',
        '콘텐츠 저작권: 업로드한 사진의 저작권은 포토그래퍼에게 귀속됩니다. 회사는 서비스 운영 목적의 비독점적, 철회 가능한 라이선스만 부여받습니다.',
      ] },
    ],
  },
  {
    title: '제5조 (포토그래퍼의 의무)',
    items: [
      { type: 'heading', text: '5.1 콘텐츠 관련 의무' },
      { type: 'numbered', items: [
        '본인 촬영 원칙: 포토그래퍼는 반드시 본인이 직접 촬영한 사진만 업로드해야 합니다. 타인의 사진을 무단으로 업로드하는 행위는 즉시 계정 해지 사유에 해당합니다.',
        '품질 유지: 서비스의 품질을 유지하기 위해 최소한의 화질 기준을 충족하는 사진을 업로드해야 합니다.',
        '적법한 촬영: 야구장 및 경기장의 촬영 규정을 준수하여 촬영된 사진만 업로드해야 합니다. 출입 금지 구역, 촬영 금지 구역에서 촬영한 사진은 업로드할 수 없습니다.',
        '초상권 존중: 선수, 코치, 관중 등 타인의 초상권을 존중해야 합니다. 선수 본인 또는 소속 구단으로부터 콘텐츠 삭제 요청이 있는 경우, 회사는 해당 콘텐츠를 삭제할 수 있습니다.',
        '업로드 제한: 사진 1장당 최대 20MB까지 업로드할 수 있습니다.',
      ] },
      { type: 'heading', text: '5.2 정산 관련 의무' },
      { type: 'numbered', items: [
        '정확한 정보 제공: 정산에 필요한 계좌 정보, 세금 관련 정보를 정확하게 제공하고, 변경 시 즉시 업데이트해야 합니다.',
        '세금 신고: 회사는 포토그래퍼의 후원금 수익에 대해 3.3% 원천징수만 처리합니다. 그 외의 종합소득세 신고 등 세무 의무는 포토그래퍼 본인에게 있습니다.',
        '부정 행위 금지: 자작 후원, 허위 계정을 통한 후원금 조작, 기타 결제 시스템 악용 행위는 금지됩니다.',
      ] },
      { type: 'heading', text: '5.3 커뮤니티 관련 의무' },
      { type: 'bullets', items: [
        '기본 약관 및 커뮤니티 가이드라인을 준수해야 합니다.',
        '팬 회원과의 건전한 관계를 유지해야 하며, 후원을 강요하거나 부적절한 방법으로 유도해서는 안 됩니다.',
        '회사를 대신하여 행동하거나, 회사의 공식 대표인 것처럼 행동해서는 안 됩니다.',
      ] },
    ],
  },
  {
    title: '제6조 (금지 콘텐츠)',
    items: [
      { type: 'body', text: '포토그래퍼는 다음에 해당하는 사진을 업로드할 수 없습니다.' },
      { type: 'numbered', items: [
        '본인이 직접 촬영하지 않은 사진 (타인의 사진 도용)',
        '음란하거나 선정적인 콘텐츠',
        '폭력적이거나 혐오를 조장하는 콘텐츠',
        '특정 선수, 코치, 관중을 비하하거나 모욕하는 콘텐츠',
        '야구와 무관한 상업적 광고 또는 홍보 콘텐츠',
        '타인의 개인정보(얼굴 클로즈업 등)가 부적절하게 노출된 콘텐츠',
        '경기장 촬영 규정을 위반하여 촬영된 콘텐츠',
        '허위 정보를 포함하거나 조작된 콘텐츠',
        '기타 관련 법령에 위반되는 콘텐츠',
      ] },
      { type: 'body', text: '회사는 위 기준에 해당하는 콘텐츠를 사전 통보 없이 삭제할 수 있으며, 반복 위반 시 기본 약관 제9조(커뮤니티 가이드라인)의 제재 단계가 적용됩니다.' },
    ],
  },
  {
    title: '제7조 (후원금 및 정산)',
    items: [
      { type: 'heading', text: '7.1 후원금 구조' },
      { type: 'body', text: '팬 회원이 포토그래퍼에게 후원할 때, 후원금은 다음과 같이 배분됩니다.' },
      { type: 'table', headers: ['항목', '비율/금액', '설명'], rows: [
        ['Paddle 결제 수수료', '5% + $0.50/건', '후원금에서 선공제 (Paddle이 MOR로서 직접 처리)'],
        ['플랫폼 수수료', 'Paddle 수수료 공제 후 금액의 30%', '서비스 운영 비용으로 회사에 귀속'],
        ['포토그래퍼 수령액', 'Paddle 수수료 공제 후 금액의 70%', '원천징수세(3.3%) 공제 후 포토그래퍼에게 지급'],
      ] },
      { type: 'heading', text: '7.2 정산 절차' },
      { type: 'numbered', items: [
        '정산 주기: 매월 20일에 전월 발생분을 일괄 정산합니다.',
        '최소 정산 금액: 정산금이 10,000원 미만인 경우, 다음 정산일로 이월됩니다. 이월된 금액은 누적되어 최소 정산 금액 도달 시 지급됩니다.',
        '원천징수: 회사는 포토그래퍼의 정산금에서 3.3%의 원천징수세(소득세 3% + 지방소득세 0.3%)를 공제한 후 지급합니다.',
        '정산 계좌: 포토그래퍼가 등록한 본인 명의 계좌로 입금됩니다. 타인 명의 계좌로의 정산은 불가합니다.',
        '정산 내역 확인: 포토그래퍼는 서비스 내 정산 페이지에서 후원 내역, 수수료 공제 내역, 지급 예정액 등을 실시간으로 확인할 수 있습니다.',
      ] },
      { type: 'heading', text: '7.3 정산 관련 유의사항' },
      { type: 'bullets', items: [
        '계좌 정보 오류로 인한 지급 지연에 대해 회사는 책임을 지지 않습니다.',
        '부정 행위가 의심되는 경우, 회사는 정산을 보류하고 조사를 진행할 수 있습니다. 조사 결과 부정 행위가 확인되면 해당 후원금은 환수되며, 계정이 해지될 수 있습니다.',
        '포토그래퍼 계정 전환 취소 또는 서비스 탈퇴 시, 미정산 후원금은 최종 정산일에 일괄 지급됩니다.',
        '서비스 종료 시, 미정산 후원금은 서비스 종료 공지일로부터 60일 이내에 정산 완료됩니다.',
      ] },
    ],
  },
  {
    title: '제8조 (저작권 및 라이선스)',
    items: [
      { type: 'heading', text: '8.1 저작권 귀속' },
      { type: 'bullets', items: [
        '포토그래퍼가 업로드한 전문 포토의 저작권은 해당 포토그래퍼에게 귀속됩니다.',
        '회사는 포토그래퍼의 사진에 대한 저작권을 주장하지 않습니다.',
      ] },
      { type: 'heading', text: '8.2 플랫폼 라이선스' },
      { type: 'body', text: '포토그래퍼는 사진을 업로드함으로써, 회사에 다음의 라이선스를 부여합니다.' },
      { type: 'bullets', items: [
        '범위: 서비스 내 표시, 배포, 추천, 프로모션 목적의 사용',
        '성격: 비독점적, 로열티 없는, 철회 가능한 라이선스',
        '철회: 포토그래퍼가 사진을 삭제하면 라이선스는 즉시 철회됩니다',
      ] },
      { type: 'note', text: '중요: 회사는 포토그래퍼의 사진을 별도의 동의 없이 서비스 외부에서 상업적 목적(광고, 판매, 제3자 라이선스 등)으로 이용하지 않습니다.' },
      { type: 'heading', text: '8.3 사진 보호' },
      { type: 'bullets', items: [
        '서비스에 업로드된 사진은 다운로드할 수 없도록 기술적으로 보호됩니다.',
        '스크린샷, 화면 녹화, 기타 기술적 수단을 통한 무단 복제도 금지됩니다.',
        '포토그래퍼는 업로드 시 워터마크 적용 여부를 선택할 수 있습니다.',
        '사진의 무단 복제가 발견된 경우, 회사는 해당 사용자에 대해 제재 조치를 취하며, 포토그래퍼에게 통지합니다.',
      ] },
    ],
  },
  {
    title: '제9조 (선수 초상권 및 퍼블리시티권)',
    items: [
      { type: 'body', text: '우다몬은 KBO와 공식 라이선스 관계가 없는 독립적인 팬 커뮤니티 플랫폼입니다. 포토그래퍼는 다음 사항을 이해하고 동의합니다.' },
      { type: 'numbered', items: [
        '서비스에 업로드되는 선수 관련 사진에 대한 초상권 및 퍼블리시티권 관련 책임은 원칙적으로 해당 사진을 업로드한 포토그래퍼에게 있습니다.',
        '선수 본인 또는 소속 구단, KBO로부터 콘텐츠 삭제 요청이 있는 경우, 회사는 해당 콘텐츠를 삭제할 수 있으며, 포토그래퍼에게 사전 또는 사후 통지합니다.',
        '포토그래퍼는 선수의 사적 공간에서의 촬영, 초상권을 심각하게 침해하는 클로즈업 사진, 선수를 비하하거나 모욕하는 목적의 사진을 업로드해서는 안 됩니다.',
        '회사는 선수 초상권 관련 분쟁에서 포토그래퍼를 대리하거나 법적 보호를 제공할 의무가 없습니다.',
        '회사는 선수 초상권 관련 법적 분쟁이 발생할 경우, 관련 콘텐츠를 임시로 비공개 처리할 수 있습니다.',
      ] },
    ],
  },
  {
    title: '제10조 (제재 및 자격 정지)',
    items: [
      { type: 'heading', text: '10.1 제재 사유' },
      { type: 'body', text: '회사는 포토그래퍼가 다음에 해당하는 경우 제재 조치를 취할 수 있습니다.' },
      { type: 'bullets', items: [
        '본 약관 또는 기본 약관을 위반한 경우',
        '타인의 사진을 무단으로 업로드한 경우',
        '후원금 관련 부정 행위가 확인된 경우',
        '선수 초상권을 심각하게 침해한 경우',
        '금지 콘텐츠를 반복적으로 업로드한 경우',
        '기타 서비스 운영에 심각한 지장을 초래한 경우',
      ] },
      { type: 'heading', text: '10.2 제재 단계' },
      { type: 'table', headers: ['단계', '조치 내용', '효과'], rows: [
        ['1차 경고', '해당 콘텐츠 삭제 + 경고 알림', '포토그래퍼 기능 유지'],
        ['2차 제한', '업로드 기능 일시 제한 (7일~14일)', '기존 콘텐츠 유지, 후원 수령 유지'],
        ['3차 정지', '포토그래퍼 자격 정지 (30일~90일)', '업로드/후원 수령 정지, 정산 보류'],
        ['4차 해지', '포토그래퍼 자격 영구 해지', '팬 회원으로 강제 전환, 미정산금 최종 정산 후 지급'],
      ] },
      { type: 'note', text: '중대한 위반(사진 도용, 결제 사기, 불법 콘텐츠 등)의 경우 경고 없이 즉시 자격이 해지될 수 있습니다.' },
      { type: 'heading', text: '10.3 이의 제기' },
      { type: 'body', text: '제재 조치에 대해 이의가 있는 경우, cs@udamonfan.com으로 접수할 수 있으며, 회사는 접수일로부터 7영업일 이내에 검토 결과를 통지합니다.' },
    ],
  },
  {
    title: '제11조 (면책 조항)',
    items: [
      { type: 'numbered', items: [
        '회사는 포토그래퍼가 업로드한 콘텐츠의 적법성, 정확성, 품질에 대해 보증하지 않습니다.',
        '회사는 포토그래퍼와 팬 회원 간의 분쟁에 대해 개입할 의무가 없습니다.',
        '회사는 포토그래퍼의 후원금 수익에 대한 종합소득세 신고 의무를 대행하지 않습니다 (3.3% 원천징수만 처리).',
        '회사는 선수 초상권, 퍼블리시티권 관련 분쟁에서 포토그래퍼를 대리하지 않습니다.',
        '회사는 Paddle의 결제 시스템 오류, 장애로 인한 정산 지연에 대해 직접적인 책임을 지지 않으나, 문제 해결을 위해 합리적으로 노력합니다.',
        '천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.',
      ] },
    ],
  },
  {
    title: '제12조 (약관 변경)',
    items: [
      { type: 'bullets', items: [
        '회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있습니다.',
        '약관 변경 시 변경 내용, 시행일 및 변경 사유를 시행일 7일 전부터 서비스 내 공지합니다.',
        '포토그래퍼의 권리에 중대한 영향을 미치는 변경은 30일 전부터 공지하며, 이메일 또는 푸시 알림으로 개별 통지합니다.',
        '변경된 약관에 동의하지 않는 포토그래퍼는 포토그래퍼 전환 취소 또는 회원 탈퇴를 통해 이용계약을 해지할 수 있습니다.',
      ] },
    ],
  },
  {
    title: '제13조 (준거법 및 관할)',
    items: [
      { type: 'bullets', items: [
        '본 약관은 대한민국 법률에 따라 해석됩니다.',
        '본 약관과 관련한 분쟁은 서울중앙지방법원을 전속 관할법원으로 합니다.',
        '소액 사건의 경우, 대한상사중재원 또는 한국소비자원 온라인분쟁조정(ODR, www.ecmc.or.kr)을 통해 해결할 수 있습니다.',
      ] },
    ],
  },
  {
    title: '제14조 (문의)',
    items: [
      { type: 'bullets', items: [
        '일반 문의: cs@udamonfan.com',
        '정산 및 결제 문의: pay@udamonfan.com',
        '저작권 문의: copyright@udamonfan.com',
      ] },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────
export default function PhotographerTermsScreen() {
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
        <Text style={styles.headerTitle}>포토그래퍼 이용약관</Text>
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
          <Text style={styles.metaText}>버전 1.0</Text>
        </View>

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
