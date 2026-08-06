import Masthead from "../components/site/Masthead";
import SiteFooter from "../components/site/SiteFooter";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { ROUTE_META } from "../data/routeMeta";
import { COMPANY } from "../data/company";

const EFFECTIVE_DATE = "2026년 8월 6일";

/** 칸코테크(kahnco.me) 회사 홈·블로그의 개인정보처리방침.
 *  블로그에 Google AdSense 광고를 게재하므로 쿠키·제3자 광고 고지를 포함한다. */
export default function PrivacyPage() {
  useDocumentMeta(ROUTE_META["/privacy"].title, ROUTE_META["/privacy"].description);

  return (
    <div className="site">
      <Masthead />

      <main>
        <section className="phead">
          <div className="wrap">
            <div className="crumb">Kahnco · 개인정보처리방침</div>
            <h1>개인정보처리방침</h1>
            <p>
              칸코테크(Kahnco)는 이용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다.
              본 방침은 회사 홈페이지 kahnco.me 및 블로그(blog.kahnco.me)에 적용됩니다.
            </p>
          </div>
        </section>

        <section className="band">
          <div className="wrap legal">
            <p className="eff">시행일: {EFFECTIVE_DATE}</p>

            <h2>1. 수집하는 개인정보 항목</h2>
            <p>
              본 웹사이트와 블로그는 별도의 회원가입이나 로그인 없이 열람할 수 있으며, 회사가
              이용자에게 직접 개인정보를 입력하도록 요구하지 않습니다. 다만 다음 정보가 자동 또는
              선택적으로 수집될 수 있습니다.
            </p>
            <ul>
              <li>
                <b>자동 수집</b>: 접속 로그, 브라우저·기기 정보, 쿠키, 방문 일시 등 서비스 이용
                과정에서 자동으로 생성되는 정보.
              </li>
              <li>
                <b>선택 수집</b>: 이용자가 이메일 등으로 문의할 때 스스로 제공하는 이메일 주소와
                문의 내용.
              </li>
            </ul>

            <h2>2. 개인정보의 이용 목적</h2>
            <ul>
              <li>웹사이트·블로그의 운영, 콘텐츠 제공 및 품질 개선</li>
              <li>문의에 대한 응대 및 연락</li>
              <li>광고 게재 및 통계 분석(아래 3항 참고)</li>
              <li>부정 이용 방지 및 서비스 안정성 확보</li>
            </ul>

            <h2>3. 쿠키 및 제3자 광고(Google AdSense)</h2>
            <p>
              본 블로그는 광고 게재를 위해 <b>Google AdSense</b>를 포함한 제3자 광고 사업자를
              이용합니다. 이 과정에서 다음 사항이 적용됩니다.
            </p>
            <ul>
              <li>
                Google을 포함한 제3자 공급업체는 <b>쿠키</b>를 사용하여 이용자의 이 웹사이트 또는
                다른 웹사이트 방문 기록을 바탕으로 광고를 게재합니다.
              </li>
              <li>
                Google은 <b>광고 쿠키(DoubleClick 쿠키 등)</b>를 사용해 이용자의 관심사에 맞는
                광고를 표시할 수 있습니다.
              </li>
              <li>
                이용자는{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google 광고 설정
                </a>
                에서 맞춤 광고를 해제할 수 있으며,{" "}
                <a
                  href="https://www.aboutads.info"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  aboutads.info
                </a>
                에서 제3자 공급업체의 쿠키 사용을 일괄 해제할 수 있습니다.
              </li>
              <li>
                대부분의 브라우저는 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 쿠키
                저장을 거부할 경우 일부 기능 이용에 제약이 있을 수 있습니다.
              </li>
            </ul>

            <h2>4. 개인정보의 보유 및 이용 기간</h2>
            <p>
              수집된 정보는 이용 목적이 달성되면 지체 없이 파기합니다. 다만 관련 법령이 정한
              기간이 있는 경우 해당 기간 동안 보관합니다. 문의 내용은 응대 완료 후 필요한 범위에서
              보관 후 파기합니다.
            </p>

            <h2>5. 개인정보의 제3자 제공</h2>
            <p>
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 위 3항의 광고·
              분석 목적에 따라 쿠키 기반 정보가 Google 등 제휴 사업자에게 전달될 수 있으며, 법령에
              근거가 있거나 수사기관의 적법한 요청이 있는 경우에는 예외로 합니다.
            </p>

            <h2>6. 이용자의 권리</h2>
            <p>
              이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있으며,
              브라우저 설정을 통해 쿠키 수집을 거부할 수 있습니다. 요청은 아래 연락처로 접수해
              주시면 지체 없이 조치합니다.
            </p>

            <h2>7. 개인정보 보호책임자 및 문의처</h2>
            <table>
              <tbody>
                <tr>
                  <th>상호</th>
                  <td>
                    {COMPANY.nameKo} ({COMPANY.nameEn})
                  </td>
                </tr>
                <tr>
                  <th>대표 / 보호책임자</th>
                  <td>{COMPANY.ceo}</td>
                </tr>
                <tr>
                  <th>이메일</th>
                  <td>
                    <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                  </td>
                </tr>
                <tr>
                  <th>주소</th>
                  <td>{COMPANY.address}</td>
                </tr>
              </tbody>
            </table>

            <h2>8. 방침의 변경</h2>
            <p>
              본 개인정보처리방침은 법령·서비스의 변경에 따라 개정될 수 있으며, 변경 시 본
              페이지를 통해 공지합니다.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
