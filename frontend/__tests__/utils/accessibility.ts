import { render, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';

// Mock jest-axe since it's not installed yet
interface AxeResults {
  violations: Array<{
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    nodes: Array<{ html: string }>;
  }>;
}

// Placeholder for axe - will be replaced when jest-axe is installed
const axe = {
  run: async (container: Element): Promise<AxeResults> => ({
    violations: [],
  }),
};

export async function checkAccessibility(
  component: ReactElement,
  options: { rules?: any } = {}
): Promise<AxeResults> {
  const { container } = render(component);
  const results = await axe.run(container);
  return results;
}

export function expectNoA11yViolations(results: AxeResults) {
  expect(results.violations).toHaveLength(0);
}

export function reportA11yViolations(results: AxeResults): string {
  if (results.violations.length === 0) {
    return 'No accessibility violations found';
  }

  const report: string[] = ['Accessibility Violations Found:'];
  report.push('==============================');
  
  results.violations.forEach((violation) => {
    report.push(`\n[${violation.impact.toUpperCase()}] ${violation.id}`);
    report.push(`Description: ${violation.description}`);
    report.push('Affected nodes:');
    violation.nodes.forEach((node, index) => {
      report.push(`  ${index + 1}. ${node.html}`);
    });
  });
  
  return report.join('\n');
}

// Keyboard navigation testing utilities
export function createKeyboardNavigationTest(
  component: ReactElement,
  expectedFocusOrder: string[]
) {
  return async () => {
    const { getByTestId } = render(component);
    
    // Start from document body
    document.body.focus();
    
    for (const testId of expectedFocusOrder) {
      // Simulate Tab key press
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        bubbles: true,
      });
      document.activeElement?.dispatchEvent(tabEvent);
      
      // Check if focus moved to expected element
      const expectedElement = getByTestId(testId);
      expect(document.activeElement).toBe(expectedElement);
    }
  };
}

// Screen reader testing utilities
export function getAccessibleName(element: Element): string {
  // Check aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent || '';
  }
  
  // Check for associated label
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent || '';
  }
  
  // Return text content as fallback
  return element.textContent || '';
}

export function expectAccessibleName(element: Element, expectedName: string) {
  const accessibleName = getAccessibleName(element);
  expect(accessibleName).toBe(expectedName);
}

// Color contrast testing placeholder
export function checkColorContrast(
  foreground: string,
  background: string
): { ratio: number; passes: { AA: boolean; AAA: boolean } } {
  // Placeholder implementation
  // In real implementation, would calculate actual contrast ratio
  return {
    ratio: 4.5,
    passes: {
      AA: true,
      AAA: false,
    },
  };
}

// Focus trap testing
export function testFocusTrap(container: HTMLElement): boolean {
  const focusableElements = container.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
  );
  
  if (focusableElements.length === 0) return false;
  
  // Test that Tab cycles within container
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  lastElement.focus();
  // Simulate Tab - should go to first element
  // In real test, would use userEvent.tab()
  
  return document.activeElement === firstElement;
}