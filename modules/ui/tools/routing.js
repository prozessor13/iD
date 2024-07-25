import { t, localizer } from '../../core/localizer';
import { svgIcon } from '../../svg';
import { uiTooltip } from '../tooltip';

export function uiToolRouting(context) {

    var tool = {
        id: 'routing',
        label: (s) => s.append('span').attr('class', 'localized-text').text("Routing")
    };

    tool.render = function(selection) {
        selection
            .append('button')
            .attr('class', 'bar-button')
            .attr('aria-label', 'test')
            .on('click', function() {
                const url = `${window.ROUTING_HOST}?bbox=${context.map().extent().padByMeters(300).rectangle().join()}`;
                window.open(url, "id-routing", "width=800,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes");
            })
            .call(uiTooltip()
                .placement('bottom')
                .title(() => 'Test routabiliy for the current map. If you have unsaved changes, please commit them first.')
                .scrollContainer(context.container().select('.top-toolbar'))
            )
            .call(svgIcon('#iD-icon-routing'));
    };

    return tool;
}
