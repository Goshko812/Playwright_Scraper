# Playwright_Scraper
Scraper and crawler built with Playwright and Cheerio

# Versions and Differences

**BFS version**
The BFS version uses the Breadth-First Search Approach
To ensure the crawler explores all pages more thoroughly the crawler processes all immediate links (siblings) at the current depth level before moving on to deeper levels.

**Scrape Everything**
This pretty much lets the crawler to go wild (can't recommend)

**Scrape Domain Scope only**
Scrapes within the domain scope (worse BFS version as this goes in a straight line and doesn't scan everything)

# Requirements
first install npm 

**Arch**

```bash
sudo pacman -Sy nodejs

yay -S playwright
```

**Debian/Ubuntu**

```bash
curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh

sudo bash nodesource_setup.sh

sudo apt install nodejs
```


Then install Playwright and the other dependencies

```bash
npm init playwright@latest

npm install path

npm install url

npm install cheerio

npm install fs
```
