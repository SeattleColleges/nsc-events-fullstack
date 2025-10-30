import React from 'react';

const TestLintError = () => {
  const badObject = { property: 'value' };
  
  if (true) 
    {console.log('Error');}
    
  return <div>Test Component with Linting Errors</div>;
};

export default TestLintError;

// added line to test.