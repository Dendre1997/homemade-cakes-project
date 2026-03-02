describe('Homepage Smoke Test', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('/')
  })

  it('should load the homepage and check the URL', () => {
    // Check if the URL is exactly the base URL (which Cypress appends a slash to)
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })

  it('should display critical elements on the page', () => {
    // 1. Check visibility of a critical title (using text that should be on the page)
    cy.contains('Our Bestsellers').should('be.visible')
    
    // 2. Check visibility of the navigation menu (using selectors from Header.tsx)
    // The Header contains a nav for categories, search input, and icons
    cy.get('header').should('be.visible')
    cy.get('header a[href="/cart"]').should('be.visible') // Cart icon Link

    // Desktop specific checks
    cy.viewport('macbook-15')
    cy.contains('Contact').should('be.visible')
    cy.contains('Blog').should('be.visible')
    cy.contains('Custom Cake').should('be.visible')

    // 3. Check visibility of at least one product image
    // Carousels (like our custom Framer Motion carousel) hide slides or lower their opacity
    // when they aren't active. The active slide receives a z-index of 20 (z-20).
    // Let's ask Cypress to find an image inside the *active* slide within the Bestsellers section!
    cy.contains('Our Bestsellers')
      .parents('section')
      .find('.z-20 img')
      .first()
      .should('be.visible')
      
    // Likewise, check the Hero Slider's active slide.
    // HeroSlider.tsx doesn't use Swiper, it dynamically assigns opacity-100 to the active slide.
    cy.get('div.opacity-100.scale-100').find('img').first().should('be.visible')
  })
})

describe('Product Page Smoke Test', () => {
  it('should display the Add to Cart button with the correct primary accent color', () => {
    // 1. Visit a known product page
    // Note: If 'chocolate-cake' doesn't exist in your database, replace this with a real product slug/ID!
    cy.visit('/products/bento-bloom')

    // 2. Find the Add to Cart button
    // The Button component uses the 'primary' variant by default which has the 'bg-accent' class.
    // We can find it by its text content since there should only be one main "Add to Cart" button.
    cy.contains('button', 'Add to Cart')
      .should('be.visible')
      .and('have.css', 'background-color', 'rgb(197, 140, 95)') 
      
      // Explanation for rgb(197, 140, 95):
      // Your tailwind.config.js defines 'accent' as "#C58C5F".
      // Browsers (and Cypress) always compute CSS colors into rgb() format.
      // HEX #C58C5F converts exactly to rgb(197, 140, 95).
  })
})
