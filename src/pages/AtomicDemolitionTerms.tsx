import { motion } from "framer-motion";

const EFFECTIVE_DATE = "2026년 3월 19일";
const APP_NAME = "아토믹 데몰리션 (Atomic Demolition)";
const COMPANY_NAME = "칸코테크 (Kahnco)";
const CONTACT_EMAIL = "kahnco@kahnco.me";

export default function AtomicDemolitionTerms() {
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
          이용약관
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
          <Section title="제1조 (목적)">
            <p>
              이 약관은 {COMPANY_NAME}(이하 "회사")이 제공하는 {APP_NAME}{" "}
              애플리케이션(이하 "앱") 서비스의 이용과 관련하여 회사와
              이용자 간의 권리, 의무 및 책임 사항, 기타 필요한 사항을 규정함을
              목적으로 합니다.
            </p>
          </Section>

          <Section title="제2조 (정의)">
            <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ul className="list-decimal pl-5 space-y-1 mt-2">
              <li>
                <span className="text-white">"앱"</span>이란 회사가 제공하는{" "}
                {APP_NAME} 모바일 애플리케이션을 말합니다.
              </li>
              <li>
                <span className="text-white">"서비스"</span>란 앱을 통해
                제공되는 퍼즐 게임 플레이, 랭킹, 기록 저장 등 일체의 서비스를
                말합니다.
              </li>
              <li>
                <span className="text-white">"회원"</span>이란 앱에 Google
                계정으로 로그인하여 서비스를 이용하는 자를 말합니다.
              </li>
              <li>
                <span className="text-white">"게임 기록"</span>이란 각 레벨의
                클리어 시간, 이동 횟수 등 게임 플레이 결과 데이터를 말합니다.
              </li>
            </ul>
          </Section>

          <Section title="제3조 (약관의 효력 및 변경)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                이 약관은 앱 내 또는 회사 웹사이트에 게시하여 공지함으로써
                효력이 발생합니다.
              </li>
              <li>
                회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수
                있으며, 약관을 개정하는 경우 적용일자 및 개정 사유를 명시하여
                현행 약관과 함께 적용일자 7일 전부터 앱 내 공지합니다.
              </li>
              <li>
                이용자가 변경된 약관에 동의하지 않는 경우 앱 이용을 중단하고
                삭제할 수 있으며, 변경된 약관의 효력 발생일 이후에도 서비스를
                계속 이용하는 경우 약관 변경에 동의한 것으로 봅니다.
              </li>
            </ul>
          </Section>

          <Section title="제4조 (서비스의 내용)">
            <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>전략 퍼즐 게임 플레이 (5개 존, 30개 레벨)</li>
              <li>레벨별 게임 기록 저장 (클리어 시간, 이동 횟수)</li>
              <li>랭킹 서비스 (레벨별 순위 확인)</li>
              <li>Google 계정 기반 로그인 및 데이터 동기화</li>
            </ul>
          </Section>

          <Section title="제5조 (회원가입 및 계정)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                회원가입은 Google 계정을 통한 소셜 로그인 방식으로 이루어집니다.
              </li>
              <li>
                회원은 하나의 Google 계정으로 하나의 게임 계정을 사용할 수
                있습니다.
              </li>
              <li>
                회원은 앱 내에서 닉네임을 설정하여 랭킹에 표시할 수 있습니다.
              </li>
              <li>
                회원은 언제든지 회원 탈퇴를 요청할 수 있으며, 탈퇴 시 모든
                게임 기록 및 개인정보가 삭제됩니다.
              </li>
            </ul>
          </Section>

          <Section title="제6조 (서비스의 이용)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만,
                시스템 점검 등 회사의 필요에 의해 일시적으로 서비스가 중단될 수
                있습니다.
              </li>
              <li>
                앱 이용 중 광고가 게재될 수 있으며, 배너 광고, 전면 광고(3레벨
                클리어마다), 보상형 광고(되돌리기 기능) 등이 포함됩니다.
              </li>
              <li>
                게임 기록은 인터넷 연결 시 Firebase 서버에 자동 동기화되며,
                오프라인 상태에서는 기기 내에 캐시됩니다.
              </li>
            </ul>
          </Section>

          <Section title="제7조 (이용자의 의무)">
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>비정상적인 방법으로 게임 기록을 조작하거나 랭킹을 조작하는 행위</li>
              <li>앱의 운영을 방해하거나 비정상적인 방법으로 서비스에 접근하는 행위</li>
              <li>앱의 소스코드를 역분석, 디컴파일, 역어셈블하는 행위</li>
              <li>다른 이용자의 개인정보를 수집, 저장, 공개하는 행위</li>
              <li>타인의 계정을 도용하거나 부정하게 사용하는 행위</li>
              <li>기타 관련 법령에 위반되는 행위</li>
            </ul>
          </Section>

          <Section title="제8조 (서비스 이용 제한)">
            <p>
              회사는 이용자가 제7조의 의무를 위반하거나, 서비스의 정상적인
              운영을 방해한 경우 경고, 일시적 이용 정지, 영구 이용 정지 등으로
              서비스 이용을 제한할 수 있습니다.
            </p>
          </Section>

          <Section title="제9조 (면책 조항)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등
                불가항력적인 사유로 서비스를 제공할 수 없는 경우에는 책임이
                면제됩니다.
              </li>
              <li>
                회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을
                지지 않습니다.
              </li>
              <li>
                기기 변경, 앱 삭제 등으로 인한 게임 기록 손실에 대해 회사는
                책임을 지지 않습니다. 단, 동일 Google 계정으로 로그인 시 서버에
                저장된 기록은 복원됩니다.
              </li>
              <li>
                앱에 게재된 광고의 내용 및 광고주와 이용자 간의 거래에 대해
                회사는 책임을 지지 않습니다.
              </li>
            </ul>
          </Section>

          <Section title="제10조 (서비스의 변경 및 중단)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                회사는 서비스의 내용, 운영상·기술적 사항 등을 변경할 수
                있으며, 변경 시 앱 내 공지를 통해 알립니다.
              </li>
              <li>
                회사는 사업 종료, 기술적 문제 등의 사유로 서비스를 영구 중단할 수
                있으며, 이 경우 30일 전에 앱 내 공지를 통해 알립니다.
              </li>
              <li>
                게임의 레벨, 난이도, 규칙 등은 회사의 판단에 따라 변경될 수
                있습니다.
              </li>
            </ul>
          </Section>

          <Section title="제11조 (저작권 및 지적재산권)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                앱의 디자인, 소스코드, 게임 규칙, 레벨 디자인, 로고, 서비스
                명칭 등에 대한 지적재산권은 회사에 귀속됩니다.
              </li>
              <li>
                이용자는 회사의 사전 서면 동의 없이 앱의 콘텐츠를 복제, 배포,
                방송, 기타 방법에 의하여 영리 목적으로 이용하거나 제3자에게
                이용하게 할 수 없습니다.
              </li>
            </ul>
          </Section>

          <Section title="제12조 (분쟁 해결)">
            <ul className="list-decimal pl-5 space-y-2">
              <li>
                회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법령에
                따릅니다.
              </li>
              <li>
                회사와 이용자 간에 발생한 분쟁에 관한 소송의 관할법원은
                민사소송법에 따른 관할법원으로 합니다.
              </li>
            </ul>
          </Section>

          <Section title="제13조 (문의)">
            <p>
              서비스 이용에 관한 문의 사항은 아래 연락처로 문의하여 주시기
              바랍니다.
            </p>
            <div className="mt-3 space-y-1">
              <p>
                <span className="text-white">회사명:</span> {COMPANY_NAME}
              </p>
              <p>
                <span className="text-white">대표:</span> 이현준
              </p>
              <p>
                <span className="text-white">이메일:</span>{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-blue-400 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </Section>

          <div className="pt-4 text-neutral-500 border-t border-neutral-800">
            <p>부칙</p>
            <p className="mt-1">이 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
          </div>
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
