cd ./tmp
curl -L -o hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v0.123.3/hugo_0.123.3_Linux-64bit.tar.gz"
cd ../lambda
tar -xzvf ../tmp/hugo.tar.gz hugo