CONTENT_DIR := content
OUT_DIR := out
STATIC_FILES := index.css reset.css index.js calendar.js template.html

MD_FILES := $(shell find $(CONTENT_DIR) -name '*.md')
HTML_FILES := $(patsubst $(CONTENT_DIR)/%.md,$(OUT_DIR)/%.html,$(MD_FILES))
IMAGE_FILES := $(shell find $(CONTENT_DIR)/images -type f 2>/dev/null)
OUT_IMAGES := $(patsubst $(CONTENT_DIR)/%,$(OUT_DIR)/%,$(IMAGE_FILES))

all: directories $(HTML_FILES) $(OUT_IMAGES) copy_static

directories:
	@mkdir -p $(OUT_DIR)
	@for dir in $(sort $(dir $(HTML_FILES)) $(dir $(OUT_IMAGES))); do \
		mkdir -p $$dir; \
	done

$(OUT_DIR)/%.html: $(CONTENT_DIR)/%.md template.html reset.css index.css
	pandoc --toc -s \
		--css reset.css \
		--css index.css \
		-i $< \
		-o $@ \
		--template=template.html

$(OUT_DIR)/%: $(CONTENT_DIR)/%
	@mkdir -p $(dir $@)
	cp $< $@

copy_static: directories
	cp $(STATIC_FILES) $(OUT_DIR)/

clean:
	rm -rf $(OUT_DIR)

help:
	@echo "Available targets:"
	@echo "  all          - Build everything (default)"
	@echo "  clean        - Remove output directory"
	@echo "  help         - Show this help message"
	@echo ""
	@echo "Source files found:"
	@echo "  Markdown:    $(MD_FILES)"
	@echo "  Images:      $(IMAGE_FILES)"

.PHONY: all clean help directories copy_static
