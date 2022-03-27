<script>
import {Bar, HorizontalBar} from 'vue-chartjs';

export default {
  name: 'ToolUtilChart',
  extends: HorizontalBar,
  components: {
  },
  data () {return {
      options: {
        scales: {
          x: {
            stacked: true
          },
          y: {
            beginAtZero: true,
            stacked: true
          }
        },
        responsive: true,
        // maintainAspectRation: false
      },
      chartData: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
         datasets: [{
            data: [12, 19, 3, 5, 4, 3],
             borderWidth: 1
         },
         {
            data: [7, 9, 5, 8, 2, 5],
            borderWidth: 1
         },
         
         ]
      }
  }},
  methods: {
  },
  mounted () {
    fetch('/api/tools/utilstats').then(resp => {
        if (resp.ok) {
            resp.json().then(j => {
                this.chartData = {labels: [], datasets: [{
                    data:[],
                    label:"hours per week",
                    //barThickness: 30,
                    // categoryPercentage: 0.5,
                    // barPercentage: 0.8,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        // 'rgba(255, 206, 86, 0.2)',
                        // 'rgba(75, 192, 192, 0.2)',
                        // 'rgba(153, 102, 255, 0.2)',
                        // 'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        // 'rgba(255, 206, 86, 1)',
                        // 'rgba(75, 192, 192, 1)',
                        // 'rgba(153, 102, 255, 1)',
                        // 'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]};

                j.data.forEach(element => {
                    this.chartData.labels.push(element.name);
                    this.chartData.datasets[0].data.push(element.HoursPerWeek);
                });

                this.renderChart(this.chartData, {
                    scales: {
                        xAxes: [{
                            ticks: {
                                beginAtZero: true
                            },
                            categorySpacing: 0
                        }],
                        yAxes: [{
                            categorySpacing: 0,
                            ticks: {
                                beginAtZero: true
                            },
                        }]
                    },
                    // tooltips: {
                    //     callbacks: {
                    //         label: function(tooltipItem, data) {
                    //             var label = data.datasets[tooltipItem.datasetIndex].label + ' blah' || 'Blah';

                    //             // if (label) {
                    //             //     label += ': ';
                    //             // }
                    //             // label += Math.round(tooltipItem.yLabel * 100) / 100;
                    //             return label;
                    //         }
                    //     }
                    // },
                    //responsive: true,
                    maintainAspectRatio: false
                });
            });
        }
    }).catch(e => {
        console.log("Error fetching /api/users: " + e);
    });

  }
}
</script>
