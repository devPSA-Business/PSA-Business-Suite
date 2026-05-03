const fs = require('fs');

const files = [
  'tests/unit/application/GoldLiquidationUseCase.spec.ts',
  'tests/unit/application/DomainSeparation.spec.ts',
  'tests/unit/application/BuybackUseCase.spec.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/mockUserRepository\.findById/g, 'mockUserRepository.findById.mockResolvedValue');
  // because in the previous script I did: `content = content.replace(/mockUserRepository\.findByName/g, 'mockUserRepository.findById');` 
  // so `mockUserRepository.findByName.mockResolvedValue` became `mockUserRepository.findById.mockResolvedValue` 
  fs.writeFileSync(file, content);
}
console.log('Done');
