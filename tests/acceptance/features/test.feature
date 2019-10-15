Feature: test feature
  Scenario: test
    Given the user has browsed to the login page
    When the user creates new master password as "haribhandari"
    And the user re-logs in using password "haribhandari"
    Then the user must redirected to the homepage


