'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { paymentConfigurationIssues } = require('../src/configuration-readiness');
const config = { enabled: true, merchantConfigurationVerified: true, reportContractVerified: true, terminal: 'demo-terminal', appKey: 'fake-app-key', secret: 'fake-private-secret', checkoutUrl: 'https://directng.tranzila.com/demo-terminal/', orderParameter: 'order_id', orderReportField: 'user_defined_3', capturePairs: [{ txnType: 'FIXTURE', tranmode: 'FIXTURE', transtatus: 1 }], checkoutTranmode: 'FIXTURE' };
test('default preflight is blocked and never emits credentials', () => {
  assert.deepEqual(paymentConfigurationIssues(null), ['invalid-configuration-shape']);
  const issues = paymentConfigurationIssues(); assert.ok(issues.includes('payment-runtime-disabled'));
  const result = JSON.stringify(paymentConfigurationIssues({ ...config, enabled: false })); assert.ok(!result.includes(config.secret)); assert.ok(!result.includes(config.appKey));
});
test('merchant-confirmed report capture and cancellation semantics required independently', () => {
  assert.deepEqual(paymentConfigurationIssues(config), []);
  assert.ok(paymentConfigurationIssues({ ...config, reportContractVerified: false }).includes('report-capture-and-cancellation-contract-unverified'));
});
test('invalid URL, reserved field, bad modes and header injection rejected', () => {
  for (const patch of [{ checkoutUrl: 'http://directng.tranzila.com/demo-terminal/' }, { checkoutUrl: 'https://directng.tranzila.com.evil.test/demo-terminal/' }, { checkoutUrl: 'https://directng.tranzila.com:444/demo-terminal/' }, { orderParameter: 'sum' }, { capturePairs: [] }, { capturePairs: [null] }, { appKey: 'x\r\ny' }]) assert.ok(paymentConfigurationIssues({ ...config, ...patch }).length);
});
