DV.view.Notes = DV.Backbone.View.extend({
  initialize: function(options) {
    this.viewer = options.viewer;
  },
  
  render: function() {
    if (this.viewer.options.showAnnotations === false) return;

    var notes = this.viewer.model.notes;
    for (var i=0; i< notes.length; i++) {
      var anno      = notes.at(i);
      //anno.of       = _.indexOf(notes.byPage[anno.get('page') - 1], anno);
      anno.html     = this.renderNote(anno);
    }

    var rendered  = _.map(this.bySortOrder, function(anno){ return anno.html; });
    var html      = rendered.join('')
                    .replace(/class="DV-img" src="/g, 'class="DV-img" data-src="')
                    .replace(/id="DV-annotation-(\d+)"/g, function(match, id) {
      return 'id="DV-listAnnotation-' + id + '" rel="aid-' + id + '"';
    });

    this.viewer.$('div.DV-allAnnotations').html(html);

    // TODO: This is hacky, but seems to be necessary. When fixing, be sure to
    // test with both autozoom and page notes.
    this.updateAnnotationOffsets();
    _.defer(_.bind(this.updateAnnotationOffsets, this));
  },
  
  // stolen from models/annotation.js#render(annotation)
  renderNote: function(note){
    var documentModel             = this.viewer.models.document;
    var pageModel                 = this.viewer.models.pages;
    var zoom                      = pageModel.zoomFactor();
    var adata                     = note.toJSON();
    var x1, x2, y1, y2;

    if(adata.type === 'page'){
      x1 = x2 = y1 = y2           = 0;
      adata.top                   = 0;
    }else{
      y1                          = Math.round(adata.y1 * zoom);
      y2                          = Math.round(adata.y2 * zoom);
      if (x1 < this.LEFT_MARGIN) x1 = this.LEFT_MARGIN;
      x1                          = Math.round(adata.x1 * zoom);
      x2                          = Math.round(adata.x2 * zoom);
      adata.top                   = y1 - 5;
    }

    adata.owns_note               = adata.owns_note || false;
    adata.width                   = pageModel.width;
    adata.pageNumber              = adata.page;
    adata.author                  = adata.author || "";
    adata.author_organization     = adata.author_organization || "";
    adata.bgWidth                 = adata.width;
    adata.bWidth                  = adata.width - 16;
    adata.excerptWidth            = (x2 - x1) - 8;
    adata.excerptMarginLeft       = x1 - 3;
    adata.excerptHeight           = y2 - y1;
    adata.index                   = adata.page - 1;
    adata.image                   = pageModel.imageURL(adata.index);
    adata.imageTop                = y1 + 1;
    adata.tabTop                  = (y1 < 35 ? 35 - y1 : 0) + 8;
    adata.imageWidth              = pageModel.width;
    adata.imageHeight             = Math.round(pageModel.height * zoom);
    adata.regionLeft              = x1;
    adata.regionWidth             = x2 - x1 ;
    adata.regionHeight            = y2 - y1;
    adata.excerptDSHeight         = adata.excerptHeight - 6;
    adata.DSOffset                = 3;

    if (adata.access == 'public')         adata.accessClass = 'DV-accessPublic';
    else if (adata.access =='exclusive')  adata.accessClass = 'DV-accessExclusive';
    else if (adata.access =='private')    adata.accessClass = 'DV-accessPrivate';

    adata.orderClass = '';
    adata.options = this.viewer.options;
    if (adata.position == 1) adata.orderClass += ' DV-firstAnnotation';
    if (adata.position == this.viewer.model.notes.length) adata.orderClass += ' DV-lastAnnotation';

    var template = (adata.type === 'page') ? 'pageAnnotation' : 'annotation';
    return JST[template](adata);
  },
  
  renderPageNote: function(note) {
    
  },
  
  // Offsets all document pages based on interleaved page annotations.
  updateAnnotationOffsets: function(){
    this.offsetsAdjustments   = [];
    this.offsetAdjustmentSum  = 0;
    var documentModel         = this.viewer.models.document;
    var annotationsContainer  = this.viewer.$('div.DV-allAnnotations');
    var pageAnnotationEls     = annotationsContainer.find('.DV-pageNote');
    var pageNoteHeights       = this.viewer.models.pages.pageNoteHeights;
    var me = this;

    if(this.viewer.$('div.DV-docViewer').hasClass('DV-viewAnnotations') == false){
      annotationsContainer.addClass('DV-getHeights');
    }

    // First, collect the list of page annotations, and associate them with
    // their DOM elements.
    var pageAnnos = [];
    _.each(_.select(this.bySortOrder, function(anno) {
      return anno.type == 'page';
    }), function(anno, i) {
      anno.el = pageAnnotationEls[i];
      pageAnnos[anno.pageNumber] = anno;
    });

    // Then, loop through the pages and store the cumulative offset due to
    // page annotations.
    for (var i = 0, len = documentModel.totalPages; i <= len; i++) {
      pageNoteHeights[i] = 0;
      if (pageAnnos[i]) {
        var height = (this.viewer.$(pageAnnos[i].el).height() + this.PAGE_NOTE_FUDGE);
        pageNoteHeights[i - 1] = height;
        this.offsetAdjustmentSum += height;
      }
      this.offsetsAdjustments[i] = this.offsetAdjustmentSum;
    }
    annotationsContainer.removeClass('DV-getHeights');
  }
  
});
