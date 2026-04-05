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
const INTRO = `우다몬(이하 "서비스")을 운영하는 주식회사 헤이디컴퍼니(이하 "회사")는 타인의 지식재산권을 존중하며, 서비스 사용자 또한 이를 존중하도록 규정하고 있습니다.

우다몬은 사진 중심의 플랫폼으로서, 포토그래퍼의 창작물을 보호하는 것을 핵심 가치로 삼고 있습니다. 본 저작권 정책은 대한민국 저작권법에 근거하여, 저작권 침해 신고 및 삭제 절차, 반복 침해자에 대한 조치를 규정합니다.`;

const IMPORTANT_NOTE = `우다몬은 서비스에 업로드된 모든 사진의 다운로드를 기술적으로 차단하고 있으며, 스크린샷이나 화면 녹화 등을 통한 무단 복제도 금지하고 있습니다.`;

const SECTIONS: Section[] = [
  {
    title: '2. 저작권 귀속 원칙',
    items: [
      { type: 'heading', text: '2.1 사용자 콘텐츠' },
      { type: 'bullets', items: [
        '포토그래퍼가 업로드한 사진의 저작권은 해당 포토그래퍼에게 귀속됩니다.',
        '팬 회원이 업로드한 일반 사진의 저작권은 해당 팬 회원에게 귀속됩니다.',
        '댓글, 텍스트 등 기타 콘텐츠의 저작권은 해당 작성자에게 귀속됩니다.',
        '회사는 사용자의 콘텐츠에 대한 저작권을 주장하지 않습니다.',
      ] },
      { type: 'heading', text: '2.2 플랫폼 라이선스' },
      { type: 'body', text: '사용자가 콘텐츠를 업로드함으로써 회사에 부여하는 라이선스는 다음과 같습니다.' },
      { type: 'bullets', items: [
        '범위: 서비스 내 표시, 배포, 추천, 프로모션 목적',
        '성격: 비독점적, 로열티 없는, 철회 가능한 라이선스',
        '철회: 콘텐츠 삭제 시 즉시 철회',
        '제한: 회사는 별도의 동의 없이 서비스 외부에서 상업적 목적(광고, 판매, 제3자 라이선스 등)으로 이용하지 않습니다',
      ] },
      { type: 'heading', text: '2.3 플랫폼 지적재산권' },
      { type: 'body', text: '서비스의 로고, 디자인, UI, 소프트웨어, 브랜드 요소 등에 대한 지적재산권은 회사에 귀속되며, 무단 복제 및 사용을 금지합니다.' },
    ],
  },
  {
    title: '3. 저작권 침해 신고 절차',
    items: [
      { type: 'heading', text: '3.1 신고 대상' },
      { type: 'body', text: '다음의 경우 저작권 침해 신고를 접수할 수 있습니다.' },
      { type: 'bullets', items: [
        '타인이 본인의 사진을 무단으로 업로드한 경우',
        '본인의 사진이 허락 없이 타 플랫폼에서 복제되어 업로드된 경우',
        '본인의 사진이 워터마크 제거 등 변조된 상태로 업로드된 경우',
        '기타 저작권법에 의해 보호되는 콘텐츠가 무단으로 사용된 경우',
      ] },
      { type: 'heading', text: '3.2 신고 방법' },
      { type: 'body', text: '저작권 침해를 신고하려면 다음의 정보를 포함하여 copyright@udamonfan.com으로 이메일을 보내주세요.' },
      { type: 'table', headers: ['No', '필수 항목', '설명'], rows: [
        ['1', '신고자 신원 정보', '성명, 연락처, 우다몬 계정명'],
        ['2', '저작권 보유 증빙', '원본 사진, EXIF 데이터, 기타 증빙'],
        ['3', '침해 콘텐츠 식별', '침해 사진 URL 또는 스크린샷'],
        ['4', '침해 상황 설명', '구체적인 침해 설명'],
        ['5', '선서', '저작권자 또는 대리 권한 선서 문구'],
      ] },
      { type: 'note', text: '앱 내 콘텐츠 신고 기능을 통해서도 간편하게 저작권 침해를 신고할 수 있습니다.' },
    ],
  },
  {
    title: '4. 신고 처리 절차',
    items: [
      { type: 'heading', text: '4.1 처리 타임라인' },
      { type: 'table', headers: ['단계', '조치', '소요 기간'], rows: [
        ['1. 신고 접수', '접수 확인 이메일 발송', '1영업일 이내'],
        ['2. 사전 검토', '유효성 및 증빙 자료 검토', '3영업일 이내'],
        ['3. 침해자 통지', '신고 사실 및 이의제기 안내', '검토 완료 후 즉시'],
        ['4. 임시 조치', '콘텐츠 비공개 처리', '검토 완료 후 즉시'],
        ['5. 이의제기 기간', '침해 혐의자 이의 제기', '통지 후 7영업일'],
        ['6. 최종 결정', '삭제 또는 복원', '이의제기 종료 후 3영업일'],
      ] },
      { type: 'heading', text: '4.2 신고 처리 원칙' },
      { type: 'bullets', items: [
        '신속성: 전체 절차는 통상 14영업일 이내에 완료됩니다.',
        '공정성: 신고자와 침해 혐의자 양측의 주장을 공정하게 검토합니다.',
        '투명성: 처리 과정과 결과를 양측 당사자에게 통지합니다.',
        '비례성: 침해의 심각성과 반복성을 고려하여 적절한 수준의 조치를 취합니다.',
      ] },
    ],
  },
  {
    title: '5. 이의제기 (반론 통지)',
    items: [
      { type: 'body', text: '저작권 신고의 결과로 귀하의 콘텐츠가 비공개 또는 삭제된 경우, 귀하는 이에 대해 이의를 제기할 수 있습니다.' },
      { type: 'heading', text: '5.1 이의제기 방법' },
      { type: 'body', text: '다음의 정보를 포함하여 copyright@udamonfan.com으로 이메일을 보내주세요.' },
      { type: 'numbered', items: [
        '이의제기자의 성명 및 연락처',
        '비공개/삭제된 콘텐츠의 식별 정보',
        '오인 또는 실수로 비공개/삭제되었다고 판단하는 근거',
        '"본인이 해당 콘텐츠의 적법한 권리자이며, 저작권 침해가 없음을 선서합니다" 문구 포함',
      ] },
      { type: 'heading', text: '5.2 이의제기 처리' },
      { type: 'bullets', items: [
        '회사는 이의제기 접수 후 7영업일 이내에 검토를 완료합니다.',
        '이의제기가 타당한 경우, 비공개된 콘텐츠를 복원합니다.',
        '이의제기가 기각된 경우, 기각 사유를 이의제기자에게 통지합니다.',
        '양측의 주장이 평행하여 판단하기 어려운 경우, 콘텐츠를 비공개 상태로 유지하고 법적 해결을 권고합니다.',
      ] },
      { type: 'heading', text: '5.3 허위 신고 경고' },
      { type: 'note', text: '저작권을 보유하지 않은 콘텐츠에 대해 고의로 허위 신고를 하는 경우, 대한민국 저작권법 제103조의2에 따라 손해배상 책임을 질 수 있습니다. 아울러 회사는 허위 신고자의 계정을 정지할 수 있습니다.' },
    ],
  },
  {
    title: '6. 반복 침해자에 대한 조치',
    items: [
      { type: 'body', text: '회사는 저작권을 반복적으로 침해하는 사용자에 대해 다음과 같은 단계적 조치를 취합니다.' },
      { type: 'table', headers: ['횟수', '단계', '조치'], rows: [
        ['1회', '경고', '콘텐츠 삭제 + 경고 알림'],
        ['2회', '제한', '콘텐츠 삭제 + 업로드 14일 제한'],
        ['3회', '정지', '콘텐츠 삭제 + 계정 30일 정지'],
        ['4회+', '영구 해지', '계정 영구 해지 + 전체 콘텐츠 삭제'],
      ] },
      { type: 'note', text: '타인의 사진을 자신의 것처럼 업로드하는 "사진 도용" 행위는 특히 심각한 위반으로 간주되며, 최초 발견 시에도 경고 없이 즉시 계정 해지 조치가 취해질 수 있습니다.' },
    ],
  },
  {
    title: '7. 선수 초상권 및 퍼블리시티권',
    items: [
      { type: 'body', text: '우다몬은 KBO와 공식 라이선스 관계가 없는 독립적인 팬 커뮤니티 플랫폼입니다.' },
      { type: 'heading', text: '7.1 초상권 관련 원칙' },
      { type: 'bullets', items: [
        '서비스에 업로드되는 선수 관련 사진에 대한 초상권 및 퍼블리시티권 관련 책임은 원칙적으로 해당 사진을 업로드한 사용자에게 있습니다.',
        '사용자는 선수의 사적 공간에서의 촬영, 초상권을 심각하게 침해하는 클로즈업 사진, 선수를 비하하거나 모욕하는 목적의 사진을 업로드해서는 안 됩니다.',
      ] },
      { type: 'heading', text: '7.2 초상권 관련 삭제 요청' },
      { type: 'bullets', items: [
        '선수 본인 또는 소속 구단, KBO로부터 콘텐츠 삭제 요청이 있는 경우, 회사는 해당 콘텐츠를 삭제할 수 있습니다.',
        '초상권 관련 삭제 요청은 copyright@udamonfan.com으로 접수할 수 있습니다.',
        '회사는 초상권 관련 법적 분쟁이 발생할 경우, 관련 콘텐츠를 임시로 비공개 처리할 수 있습니다.',
      ] },
    ],
  },
  {
    title: '8. 사진 보호 기술적 조치',
    items: [
      { type: 'body', text: '회사는 포토그래퍼의 창작물을 보호하기 위해 다음의 기술적 조치를 시행하고 있습니다.' },
      { type: 'bullets', items: [
        '다운로드 차단: 서비스에 업로드된 모든 사진은 다운로드할 수 없습니다.',
        '워터마크: 포토그래퍼는 업로드 시 워터마크 적용 여부를 선택할 수 있습니다.',
        '우클릭 방지: 사진에 대한 우클릭 방지 기술을 적용하여 무단 복제를 방지합니다.',
        '무단 복제 금지: 스크린샷, 화면 녹화, 기타 기술적 수단을 통한 무단 복제는 이용약관 위반으로 간주되며 제재 조치의 대상이 됩니다.',
      ] },
      { type: 'body', text: '다만, 기술적 보호 조치에도 불구하고 무단 복제가 발생할 수 있으며, 회사는 완벽한 복제 방지를 보증하지는 않습니다. 무단 복제를 발견한 경우 즉시 신고해 주시기 바랍니다.' },
    ],
  },
  {
    title: '9. 법적 근거',
    items: [
      { type: 'body', text: '본 저작권 정책은 다음의 법령에 근거하여 운영됩니다.' },
      { type: 'bullets', items: [
        '저작권법 (특히 제103조, 온라인서비스제공자의 면책 및 복제·전송 중단 청구)',
        '정보통신망법 (온라인서비스제공자의 권리침해 정보 삭제 의무)',
        '콘텐츠산업진흥법 (콘텐츠 불법 복제 방지)',
        '민법 (초상권, 퍼블리시티권 관련)',
      ] },
    ],
  },
  {
    title: '10. 문의',
    items: [
      { type: 'body', text: '저작권 관련 문의는 다음 채널을 통해 가능합니다.' },
      { type: 'bullets', items: [
        '저작권 침해 신고 및 이의제기: copyright@udamonfan.com',
        '일반 문의: cs@udamonfan.com',
        '앱 내 신고: 콘텐츠 신고 기능 이용',
      ] },
      { type: 'body', text: '저작권 침해 신고에 대한 추가적인 구제 방법으로 다음 기관을 이용할 수 있습니다.' },
      { type: 'table', headers: ['기관명', '전화번호', '웹사이트'], rows: [
        ['한국저작권위원회', '1800-5455', 'www.copyright.or.kr'],
        ['한국저작권보호원', '1588-0190', 'www.kcopa.or.kr'],
        ['문화체육관광부', '1600-1120', 'www.mcst.go.kr'],
      ] },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────
export default function CopyrightPolicyScreen() {
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
        <Text style={styles.headerTitle}>저작권 정책</Text>
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

        {/* Intro */}
        <Text style={styles.introText}>{INTRO}</Text>

        {/* Important Note */}
        <View style={styles.importantBox}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.importantText}>{IMPORTANT_NOTE}</Text>
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
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>우다몬 — 주식회사 헤이디컴퍼니</Text>
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
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.button,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.cardName, fontWeight: fontWeight.heading, color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  // Meta
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 8, marginBottom: 16,
  },
  metaText: { fontSize: 10, fontWeight: fontWeight.body, color: colors.textTertiary },
  metaDivider: { width: 1, height: 10, backgroundColor: colors.border },

  // Intro
  introText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body,
    color: colors.textSecondary, lineHeight: 22, marginBottom: 16,
  },

  // Important box
  importantBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.primaryAlpha8, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primaryAlpha15,
    padding: 14, marginBottom: 28,
  },
  importantText: {
    flex: 1, fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.primary, lineHeight: 20,
  },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: fontSize.body, fontWeight: fontWeight.heading,
    color: colors.textPrimary, marginBottom: 12,
  },
  subHeading: {
    fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.textPrimary, marginTop: 10, marginBottom: 6,
  },
  bodyText: {
    fontSize: fontSize.meta, fontWeight: fontWeight.body,
    color: colors.textSecondary, lineHeight: 22, marginBottom: 8,
  },

  // Lists
  listWrap: { marginBottom: 8, gap: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 4 },
  bulletDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.textTertiary, marginTop: 8,
  },
  bulletText: {
    flex: 1, fontSize: fontSize.meta, fontWeight: fontWeight.body,
    color: colors.textSecondary, lineHeight: 22,
  },
  numLabel: {
    width: 18, fontSize: fontSize.meta, fontWeight: fontWeight.name,
    color: colors.textSecondary,
  },

  // Tables
  tableWrap: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    overflow: 'hidden', marginVertical: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: fontSize.micro, fontWeight: fontWeight.heading,
    color: colors.textPrimary,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  tableCell: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: fontSize.micro, fontWeight: fontWeight.body,
    color: colors.textSecondary, lineHeight: 18,
  },
  tableFirstCol: { flex: 0, width: 60 },

  // Notes
  noteWrap: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.warning,
    padding: 12, marginVertical: 8,
  },
  noteText: {
    fontSize: fontSize.micro, fontWeight: fontWeight.body,
    color: colors.textSecondary, lineHeight: 18,
  },

  // Footer
  footerBlock: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 20, marginTop: 8,
  },
  companyInfo: { gap: 4 },
  companyName: { fontSize: fontSize.meta, fontWeight: fontWeight.heading, color: colors.textPrimary },
  companyDetail: { fontSize: fontSize.micro, fontWeight: fontWeight.body, color: colors.textTertiary },
});
