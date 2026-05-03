const fs = require('fs');

const files = [
  'tests/unit/application/GoldLiquidationUseCase.spec.ts',
  'tests/unit/application/DomainSeparation.spec.ts',
  'tests/unit/application/BuybackUseCase.spec.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/findByName: /g, 'findById: vi.fn(), findByName: ');
  // In the tests they might have `mockUserRepository.findByName.mockResolvedValue`
  content = content.replace(/mockUserRepository\.findByName/g, 'mockUserRepository.findById');
  content = content.replace(/mockUserRepository \= \{/g, 'mockUserRepository = { findById: vi.fn(),');
  fs.writeFileSync(file, content);
}
console.log('Done');
