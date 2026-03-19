import { motion } from "framer-motion";

const EFFECTIVE_DATE = "2026년 3월 19일";
const APP_NAME = "아토믹 데몰리션 (Atomic Demolition)";
const COMPANY_NAME = "칸코테크 (Kahnco)";
const CONTACT_EMAIL = "kahnco@kahnco.me";

export default function AtomicDemolitionPrivacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md">
        <a href="/">
          <img src="/logo.jpg" alt="Kahnco" className="w-8 h-8 rounded" />
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.h1
          className="text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          개인정보처리방침
        </motion.h1>
        <motion.p
          className="text-neutral-400 mb-10 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {APP_NAME} · 시행일: {EFFECTIVE_DATE}
        </motion.p>

        <motion.div
          className="space-y-10 text-neutral-300 text-sm leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Section title="1. 개인정보의 처리 목적">
            <p>
              {COMPANY_NAME}(이하 "회사")은(는) {APP_NAME} 애플리케이션(이하
              "앱")과 관련하여 다음의 목적을 위해 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를
              이행할 예정입니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>회원 식별 및 회원 서비스 제공</li>
              <li>게임 기록 저장 및 랭킹 서비스 제공</li>
              <li>서비스 이용 통계 분석 및 서비스 개선</li>
              <li>광고 게재 및 광고 성과 측정</li>
              <li>푸시 알림 서비스 제공</li>
            </ul>
          </Section>

          <Section title="2. 처리하는 개인정보 항목">
            <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 처리합니다.</p>

            <h4 className="text-white font-medium mt-4 mb-1">
              가. 회원가입 시 수집되는 정보
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google 계정 정보 (이메일 주소, 프로필 사진 URL, 닉네임)</li>
              <li>고유 사용자 식별자 (UID)</li>
            </ul>

            <h4 className="text-white font-medium mt-4 mb-1">
              나. 서비스 이용 과정에서 수집되는 정보
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>게임 기록 (레벨별 클리어 시간, 이동 횟수)</li>
              <li>기기 정보 (기기 모델명, 운영체제 버전, 기기 식별자)</li>
              <li>앱 사용 기록 (화면 조회 이벤트)</li>
              <li>광고 식별자 (ADID/IDFA)</li>
              <li>푸시 알림 토큰</li>
            </ul>

            <h4 className="text-white font-medium mt-4 mb-1">
              다. 이용자가 직접 입력하는 정보
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>닉네임 (랭킹 표시용)</li>
            </ul>
          </Section>

          <Section title="3. 개인정보의 처리 및 보유 기간">
            <p>
              회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터
              개인정보를 수집 시에 동의 받은 개인정보 보유·이용 기간 내에서
              개인정보를 처리·보유합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <span className="text-white">회원 정보 및 게임 기록:</span>{" "}
                회원 탈퇴 시까지 보유하며, 탈퇴 시 지체 없이 파기
              </li>
              <li>
                <span className="text-white">기기 내 저장 데이터:</span>{" "}
                앱 삭제 시 자동 파기
              </li>
              <li>
                <span className="text-white">Firebase Analytics 데이터:</span>{" "}
                Google의 데이터 보존 정책에 따름 (기본 14개월)
              </li>
              <li>
                <span className="text-white">광고 관련 데이터:</span>{" "}
                Google AdMob 정책에 따름
              </li>
            </ul>
          </Section>

          <Section title="4. 개인정보의 제3자 제공">
            <p>
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만,
              다음의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </Section>

          <Section title="5. 개인정보 처리의 위탁">
            <p>
              회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를
              위탁하고 있습니다.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2 pr-4 text-white font-medium">수탁업체</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-400">
                  <tr className="border-b border-neutral-800">
                    <td className="py-2 pr-4">Google LLC</td>
                    <td className="py-2">Firebase Authentication (회원 인증), Cloud Firestore (데이터 저장), Firebase Analytics (서비스 이용 분석), Google AdMob (광고 게재), Firebase Cloud Messaging (푸시 알림)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="6. 개인정보의 파기 절차 및 방법">
            <p>
              회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가
              불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <span className="text-white">서버 저장 데이터:</span>{" "}
                회원 탈퇴 요청 시 Firebase에 저장된 회원 정보 및 게임 기록을 지체 없이 삭제합니다.
              </li>
              <li>
                <span className="text-white">기기 내 저장 데이터:</span>{" "}
                앱 삭제(언인스톨) 시 자동으로 파기됩니다.
              </li>
            </ul>
          </Section>

          <Section title="7. 이용자의 권리·의무 및 행사 방법">
            <p>이용자는 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>회원 탈퇴를 통한 개인정보 삭제 요청</li>
              <li>기기 설정에서 광고 식별자 재설정 또는 추적 거부 가능</li>
              <li>기기 설정에서 푸시 알림 수신 거부 가능</li>
              <li>앱 삭제를 통한 모든 로컬 데이터 삭제 가능</li>
              <li>개인정보 열람, 정정, 삭제 요청은 아래 개인정보 보호책임자에게 연락</li>
            </ul>
          </Section>

          <Section title="8. 개인정보의 안전성 확보 조치">
            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>데이터 전송 시 SSL/TLS 암호화 통신 적용</li>
              <li>Firebase 보안 규칙을 통한 데이터 접근 제어</li>
              <li>Firebase Authentication을 통한 사용자 인증 및 권한 관리</li>
              <li>게임 기록은 인증된 사용자 본인만 접근 가능</li>
            </ul>
          </Section>

          <Section title="9. 자동 수집 장치의 설치·운영 및 거부에 관한 사항">
            <p>
              본 앱은 Firebase Analytics와 Google AdMob을 통해 이용자의 서비스
              이용 정보를 자동으로 수집할 수 있습니다. 이용자는 다음과 같은
              방법으로 자동 수집을 거부할 수 있습니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <span className="text-white">Android:</span> 설정 → Google →
                광고 → '광고 개인 최적화 선택 해제' 활성화
              </li>
              <li>
                <span className="text-white">iOS:</span> 설정 → 개인정보 보호 및
                보안 → 추적 → 앱의 추적 요청 허용 비활성화
              </li>
            </ul>
          </Section>

          <Section title="10. 개인정보 보호책임자">
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
              처리와 관련한 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와
              같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-3 space-y-1">
              <p>
                <span className="text-white">성명:</span> 이현준
              </p>
              <p>
                <span className="text-white">직위:</span> 대표
              </p>
              <p>
                <span className="text-white">연락처:</span>{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-blue-400 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </Section>

          <Section title="11. 개인정보 처리방침의 변경">
            <p>
              이 개인정보처리방침은 {EFFECTIVE_DATE}부터 적용됩니다. 법령 및
              방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경
              사항의 시행 7일 전부터 앱 내 공지사항을 통하여 고지할 것입니다.
            </p>
          </Section>

          <Section title="12. 권익 침해 구제 방법">
            <p>
              개인정보 침해에 대한 피해 구제, 상담 등이 필요하신 경우 아래 기관에
              문의하실 수 있습니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>개인정보침해 신고센터: (국번없이) 118</li>
              <li>개인정보 분쟁조정위원회: 1833-6972</li>
              <li>대검찰청 사이버수사과: (국번없이) 1301</li>
              <li>경찰청 사이버수사국: (국번없이) 182</li>
            </ul>
          </Section>
        </motion.div>
      </main>

      <footer className="py-12 px-6 text-center text-xs text-neutral-600 space-y-1">
        <p className="font-medium text-neutral-500">{COMPANY_NAME}</p>
        <p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-blue-400 transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="pt-2">© 2026 Kahnco. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      {children}
    </section>
  );
}
