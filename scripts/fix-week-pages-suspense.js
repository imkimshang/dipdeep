const fs = require('fs');
const path = require('path');

const weekFiles = ['week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7', 'week8', 'week9', 'week10', 'week11', 'week12'];

weekFiles.forEach(week => {
  const filePath = path.join(__dirname, '..', 'app', 'workbook', week, 'page.tsx');
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${week}: file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 이미 Suspense로 감싸져 있는지 확인
  if (content.includes('export default function Week') && content.includes('Suspense')) {
    console.log(`${week}: Already has Suspense`);
    return;
  }

  // 1. import에 Suspense 추가 (없는 경우)
  if (!content.includes("import { useState, useEffect, Suspense }")) {
    content = content.replace(
      /import { useState, useEffect }/g,
      'import { useState, useEffect, Suspense }'
    );
  }

  // 2. export const dynamic 제거 (클라이언트 컴포넌트에서는 작동하지 않음)
  content = content.replace(/export const dynamic = 'force-dynamic';[\s\n]*\/\/ 이 페이지는 실시간으로 생성하도록 강제합니다\./g, '');

  // 3. export default function WeekXPage() -> function WeekXPageContent()
  const weekNum = week.replace('week', '');
  const componentName = `Week${weekNum}Page`;
  const contentName = `Week${weekNum}PageContent`;
  
  content = content.replace(
    new RegExp(`export default function ${componentName}\\(\\)`, 'g'),
    `function ${contentName}()`
  );

  // 4. 파일 끝에 Suspense 래퍼 추가
  const exportDefaultMatch = content.match(/export default function \w+/);
  if (!exportDefaultMatch) {
    // 파일 끝에서 마지막 } 찾기 (컴포넌트의 끝)
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      const beforeLastBrace = content.substring(0, lastBraceIndex);
      const afterLastBrace = content.substring(lastBraceIndex);
      
      const newExport = `
export default function ${componentName}() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <${contentName} />
    </Suspense>
  )
}
`;
      content = beforeLastBrace + afterLastBrace + '\n' + newExport;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`${week}: Fixed`);
});

console.log('All week pages fixed!');

